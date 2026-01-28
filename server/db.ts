import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  websites, 
  databases, 
  firewallRules, 
  ipWhitelist, 
  operationLogs,
  files,
  serverConnections,
  deploymentHistory,
  InsertWebsite,
  InsertDatabase,
  InsertFirewallRule,
  InsertIpWhitelist,
  InsertOperationLog,
  InsertFile,
  InsertServerConnection,
  InsertDeploymentHistory
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

// Website operations
export async function createWebsite(website: InsertWebsite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(websites).values(website);
  return result;
}

export async function getWebsites() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(websites).orderBy(desc(websites.createdAt));
}

export async function getWebsiteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(websites).where(eq(websites.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateWebsite(id: number, data: Partial<InsertWebsite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(websites).set(data).where(eq(websites.id, id));
}

export async function deleteWebsite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(websites).where(eq(websites.id, id));
}

// Database operations
export async function createDatabase(database: InsertDatabase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(databases).values(database);
}

export async function getDatabases() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(databases).orderBy(desc(databases.createdAt));
}

export async function deleteDatabase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(databases).where(eq(databases.id, id));
}

// Firewall rules operations
export async function createFirewallRule(rule: InsertFirewallRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(firewallRules).values(rule);
}

export async function getFirewallRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(firewallRules).orderBy(desc(firewallRules.createdAt));
}

export async function updateFirewallRule(id: number, data: Partial<InsertFirewallRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(firewallRules).set(data).where(eq(firewallRules.id, id));
}

export async function deleteFirewallRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(firewallRules).where(eq(firewallRules.id, id));
}

// IP Whitelist operations
export async function createIpWhitelist(ip: InsertIpWhitelist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(ipWhitelist).values(ip);
}

export async function getIpWhitelist() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ipWhitelist).orderBy(desc(ipWhitelist.createdAt));
}

export async function deleteIpWhitelist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(ipWhitelist).where(eq(ipWhitelist.id, id));
}

// Operation logs
export async function createOperationLog(log: InsertOperationLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(operationLogs).values(log);
}

export async function getOperationLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(operationLogs).orderBy(desc(operationLogs.createdAt)).limit(limit);
}

// File operations
export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(files).values(file);
}

export async function getFilesByPath(path: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(files).where(eq(files.parentPath, path));
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(files).where(eq(files.id, id));
}

// Server connection operations
export async function createServerConnection(connection: InsertServerConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(serverConnections).values(connection);
  return result;
}

export async function getServerConnections() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serverConnections).orderBy(desc(serverConnections.createdAt));
}

export async function getServerConnectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(serverConnections).where(eq(serverConnections.id, id)).limit(1);
  return result[0];
}

export async function updateServerConnection(id: number, data: Partial<InsertServerConnection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(serverConnections).set(data).where(eq(serverConnections.id, id));
}

export async function deleteServerConnection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(serverConnections).where(eq(serverConnections.id, id));
}

// Deployment history operations
export async function createDeploymentHistory(deployment: InsertDeploymentHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(deploymentHistory).values(deployment);
  return result;
}

export async function getDeploymentHistory(serverId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (serverId) {
    return await db.select().from(deploymentHistory)
      .where(eq(deploymentHistory.serverId, serverId))
      .orderBy(desc(deploymentHistory.startedAt));
  }
  
  return await db.select().from(deploymentHistory).orderBy(desc(deploymentHistory.startedAt));
}

export async function updateDeploymentHistory(id: number, data: Partial<InsertDeploymentHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(deploymentHistory).set(data).where(eq(deploymentHistory.id, id));
}
