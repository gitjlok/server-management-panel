import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import os from "os";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // System monitoring
  monitor: router({
    getSystemInfo: protectedProcedure.query(async () => {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      // Calculate CPU usage
      const cpuUsage = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length;

      // Get disk usage
      let diskUsage = { total: 0, used: 0, free: 0, usagePercent: 0 };
      try {
        const { stdout } = await execAsync("df -k / | tail -1 | awk '{print $2,$3,$4}'");
        const [total, used, free] = stdout.trim().split(' ').map(Number);
        diskUsage = {
          total: total * 1024,
          used: used * 1024,
          free: free * 1024,
          usagePercent: (used / total) * 100
        };
      } catch (error) {
        console.error('Failed to get disk usage:', error);
      }

      // Get network stats
      let networkStats = { rx: 0, tx: 0 };
      try {
        const { stdout } = await execAsync("cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2,$10}'");
        const [rx, tx] = stdout.trim().split(' ').map(Number);
        networkStats = { rx: rx || 0, tx: tx || 0 };
      } catch (error) {
        console.error('Failed to get network stats:', error);
      }

      return {
        cpu: {
          usage: cpuUsage,
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown'
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: (usedMem / totalMem) * 100
        },
        disk: diskUsage,
        network: networkStats,
        uptime: os.uptime(),
        platform: os.platform(),
        hostname: os.hostname(),
        loadAverage: os.loadavg()
      };
    }),

    getProcesses: protectedProcedure.query(async () => {
      try {
        const { stdout } = await execAsync("ps aux --sort=-%mem | head -20");
        const lines = stdout.trim().split('\n');
        const processes = lines.slice(1).map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            user: parts[0],
            pid: parts[1],
            cpu: parseFloat(parts[2]),
            mem: parseFloat(parts[3]),
            command: parts.slice(10).join(' ')
          };
        });
        return processes;
      } catch (error) {
        console.error('Failed to get processes:', error);
        return [];
      }
    }),

    killProcess: adminProcedure
      .input(z.object({ pid: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await execAsync(`kill -9 ${input.pid}`);
          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'kill_process',
            resource: 'process',
            resourceId: input.pid,
            status: 'success',
            ipAddress: ctx.req.ip
          });
          return { success: true };
        } catch (error) {
          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'kill_process',
            resource: 'process',
            resourceId: input.pid,
            status: 'failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            ipAddress: ctx.req.ip
          });
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to kill process' });
        }
      }),
  }),

  // Website management
  websites: router({
    list: protectedProcedure.query(async () => {
      return await db.getWebsites();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        domain: z.string().min(1),
        path: z.string().min(1),
        port: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createWebsite({
          ...input,
          createdBy: ctx.user.id,
        });
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'create_website',
          resource: 'website',
          resourceId: String(result[0].insertId),
          details: JSON.stringify(input),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true, id: result[0].insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          domain: z.string().optional(),
          status: z.enum(['running', 'stopped', 'error']).optional(),
          sslEnabled: z.boolean().optional(),
        })
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateWebsite(input.id, input.data);
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'update_website',
          resource: 'website',
          resourceId: String(input.id),
          details: JSON.stringify(input.data),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteWebsite(input.id);
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'delete_website',
          resource: 'website',
          resourceId: String(input.id),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),
  }),

  // Database management
  databases: router({
    list: protectedProcedure.query(async () => {
      return await db.getDatabases();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        username: z.string().min(1),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createDatabase({
          ...input,
          createdBy: ctx.user.id,
        });
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'create_database',
          resource: 'database',
          resourceId: String(result[0].insertId),
          details: `Database: ${input.name}`,
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteDatabase(input.id);
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'delete_database',
          resource: 'database',
          resourceId: String(input.id),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),
  }),

  // Firewall management
  firewall: router({
    list: protectedProcedure.query(async () => {
      return await db.getFirewallRules();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        port: z.number(),
        protocol: z.enum(['tcp', 'udp', 'both']),
        action: z.enum(['allow', 'deny']),
        sourceIp: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createFirewallRule({
          ...input,
          createdBy: ctx.user.id,
        });
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'create_firewall_rule',
          resource: 'firewall',
          resourceId: String(result[0].insertId),
          details: JSON.stringify(input),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateFirewallRule(input.id, { enabled: input.enabled });
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'update_firewall_rule',
          resource: 'firewall',
          resourceId: String(input.id),
          details: `Enabled: ${input.enabled}`,
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteFirewallRule(input.id);
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'delete_firewall_rule',
          resource: 'firewall',
          resourceId: String(input.id),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),
  }),

  // IP Whitelist management
  ipWhitelist: router({
    list: protectedProcedure.query(async () => {
      return await db.getIpWhitelist();
    }),

    create: adminProcedure
      .input(z.object({
        ipAddress: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createIpWhitelist({
          ...input,
          createdBy: ctx.user.id,
        });
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'add_ip_whitelist',
          resource: 'ip_whitelist',
          resourceId: String(result[0].insertId),
          details: input.ipAddress,
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteIpWhitelist(input.id);
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'remove_ip_whitelist',
          resource: 'ip_whitelist',
          resourceId: String(input.id),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        return { success: true };
      }),
  }),

  // Operation logs
  logs: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        return await db.getOperationLogs(input?.limit || 100);
      }),
  }),

  // File management
  files: router({
    list: protectedProcedure
      .input(z.object({ path: z.string().default('/') }))
      .query(async ({ input }) => {
        try {
          const dirPath = input.path === '/' ? '/home' : input.path;
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          
          const files = await Promise.all(entries.map(async (entry) => {
            const fullPath = `${dirPath}/${entry.name}`;
            try {
              const stats = await fs.stat(fullPath);
              return {
                name: entry.name,
                path: fullPath,
                size: stats.size,
                isDirectory: entry.isDirectory(),
                permissions: (stats.mode & parseInt('777', 8)).toString(8),
                modifiedAt: stats.mtime,
              };
            } catch (error) {
              return null;
            }
          }));

          return files.filter(f => f !== null);
        } catch (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to read directory' });
        }
      }),

    read: protectedProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        try {
          const content = await fs.readFile(input.path, 'utf-8');
          return { content };
        } catch (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to read file' });
        }
      }),

    write: adminProcedure
      .input(z.object({
        path: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          await fs.writeFile(input.path, input.content, 'utf-8');
          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'write_file',
            resource: 'file',
            resourceId: input.path,
            status: 'success',
            ipAddress: ctx.req.ip
          });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to write file' });
        }
      }),

    delete: adminProcedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const stats = await fs.stat(input.path);
          if (stats.isDirectory()) {
            await fs.rmdir(input.path, { recursive: true });
          } else {
            await fs.unlink(input.path);
          }
          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'delete_file',
            resource: 'file',
            resourceId: input.path,
            status: 'success',
            ipAddress: ctx.req.ip
          });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete file' });
        }
      }),

    createDirectory: adminProcedure
      .input(z.object({
        path: z.string(),
        name: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const newPath = `${input.path}/${input.name}`;
          await fs.mkdir(newPath);
          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'create_directory',
            resource: 'file',
            resourceId: newPath,
            status: 'success',
            ipAddress: ctx.req.ip
          });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create directory' });
        }
      }),
  }),

  // User management
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
  }),

  // Server deployment
  deployment: router({
    // List all server connections
    listServers: protectedProcedure.query(async () => {
      return await db.getServerConnections();
    }),

    // Get single server connection
    getServer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getServerConnectionById(input.id);
      }),

    // Create server connection
    createServer: adminProcedure
      .input(z.object({
        name: z.string(),
        host: z.string(),
        port: z.number().default(22),
        username: z.string(),
        authType: z.enum(["password", "key"]),
        password: z.string().optional(),
        privateKey: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createServerConnection({
          ...input,
          createdBy: ctx.user.id,
        });
        
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'create_server',
          resource: 'server',
          resourceId: input.name,
          status: 'success',
          ipAddress: ctx.req.ip
        });
        
        return { success: true };
      }),

    // Test server connection
    testConnection: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const server = await db.getServerConnectionById(input.id);
        if (!server) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Server not found' });
        }

        try {
          // Simulate SSH connection test (in real implementation, use ssh2 library)
          const testCommand = `timeout 5 nc -zv ${server.host} ${server.port} 2>&1`;
          const { stdout, stderr } = await execAsync(testCommand);
          
          const isSuccess = stdout.includes('succeeded') || stderr.includes('succeeded');
          
          await db.updateServerConnection(input.id, {
            status: isSuccess ? 'connected' : 'error',
            lastConnected: isSuccess ? new Date() : undefined,
          });

          await db.createOperationLog({
            userId: ctx.user.id,
            action: 'test_connection',
            resource: 'server',
            resourceId: String(input.id),
            status: isSuccess ? 'success' : 'failed',
            details: stdout || stderr,
            ipAddress: ctx.req.ip
          });

          return { success: isSuccess, message: isSuccess ? '连接成功' : '连接失败' };
        } catch (error: any) {
          await db.updateServerConnection(input.id, {
            status: 'error',
          });
          
          return { success: false, message: error.message || '连接失败' };
        }
      }),

    // Delete server connection
    deleteServer: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteServerConnection(input.id);
        
        await db.createOperationLog({
          userId: ctx.user.id,
          action: 'delete_server',
          resource: 'server',
          resourceId: String(input.id),
          status: 'success',
          ipAddress: ctx.req.ip
        });
        
        return { success: true };
      }),

    // Get deployment history
    getHistory: protectedProcedure
      .input(z.object({ serverId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getDeploymentHistory(input.serverId);
      }),

    // Execute deployment
    deploy: adminProcedure
      .input(z.object({
        serverId: z.number(),
        deployType: z.string(),
        command: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const server = await db.getServerConnectionById(input.serverId);
        if (!server) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Server not found' });
        }

        // Create deployment record
        const result = await db.createDeploymentHistory({
          serverId: input.serverId,
          deployType: input.deployType,
          command: input.command,
          status: 'running',
          createdBy: ctx.user.id,
        });

        const deploymentId = Number((result as any)[0]?.insertId || 1);

        // Execute deployment asynchronously
        (async () => {
          try {
            // In real implementation, use ssh2 to execute remote commands
            // For now, simulate deployment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await db.updateDeploymentHistory(deploymentId, {
              status: 'success',
              output: '部署成功完成',
              completedAt: new Date(),
            });

            await db.createOperationLog({
              userId: ctx.user.id,
              action: 'deploy',
              resource: 'server',
              resourceId: String(input.serverId),
              status: 'success',
              ipAddress: ctx.req.ip
            });
          } catch (error: any) {
            await db.updateDeploymentHistory(deploymentId, {
              status: 'failed',
              errorMessage: error.message,
              completedAt: new Date(),
            });
          }
        })();

        return { success: true, deploymentId };
      }),
  }),
});

export type AppRouter = typeof appRouter;
