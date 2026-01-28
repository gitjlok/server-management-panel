/**
 * 安全检测模块
 * 实现智能安全检测、恶意文件扫描、SSH登录监控等功能
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * 安全风险等级
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 安全检测项
 */
export interface SecurityCheckItem {
  id: string;
  name: string;
  description: string;
  level: RiskLevel;
  status: 'pass' | 'fail' | 'warning';
  suggestion?: string;
  details?: string;
}

/**
 * SSH登录记录
 */
export interface SSHLoginRecord {
  timestamp: Date;
  ip: string;
  username: string;
  status: 'success' | 'failed';
  location?: string;
}

/**
 * 恶意IP封禁记录
 */
export interface IPBanRecord {
  ip: string;
  reason: string;
  bannedAt: Date;
  expiresAt?: Date;
  failedAttempts: number;
}

/**
 * 安全检测管理器
 */
export class SecurityManager {
  private bannedIPs: Map<string, IPBanRecord> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BAN_DURATION = 3600 * 1000; // 1小时

  /**
   * 执行全面安全检测
   */
  async runSecurityCheck(): Promise<SecurityCheckItem[]> {
    const checks: SecurityCheckItem[] = [];

    // 1. 检查SSH配置
    checks.push(await this.checkSSHConfig());

    // 2. 检查防火墙状态
    checks.push(await this.checkFirewallStatus());

    // 3. 检查系统更新
    checks.push(await this.checkSystemUpdates());

    // 4. 检查弱密码用户
    checks.push(await this.checkWeakPasswords());

    // 5. 检查开放端口
    checks.push(await this.checkOpenPorts());

    // 6. 检查可疑进程
    checks.push(await this.checkSuspiciousProcesses());

    // 7. 检查文件权限
    checks.push(await this.checkFilePermissions());

    // 8. 检查系统日志异常
    checks.push(await this.checkSystemLogs());

    return checks;
  }

  /**
   * 检查SSH配置安全性
   */
  private async checkSSHConfig(): Promise<SecurityCheckItem> {
    try {
      const { stdout } = await execAsync('cat /etc/ssh/sshd_config 2>/dev/null || echo ""');
      
      const permitRootLogin = stdout.includes('PermitRootLogin yes');
      const passwordAuth = !stdout.includes('PasswordAuthentication no');
      const defaultPort = !stdout.match(/Port\s+(?!22\b)\d+/);

      if (permitRootLogin || defaultPort) {
        return {
          id: 'ssh_config',
          name: 'SSH配置安全检查',
          description: '检查SSH服务配置是否安全',
          level: RiskLevel.HIGH,
          status: 'fail',
          suggestion: '建议禁止root直接登录、修改默认端口22、使用密钥认证',
          details: `root登录: ${permitRootLogin ? '允许' : '禁止'}, 默认端口: ${defaultPort ? '是' : '否'}`,
        };
      }

      return {
        id: 'ssh_config',
        name: 'SSH配置安全检查',
        description: '检查SSH服务配置是否安全',
        level: RiskLevel.LOW,
        status: 'pass',
      };
    } catch (error) {
      return {
        id: 'ssh_config',
        name: 'SSH配置安全检查',
        description: '检查SSH服务配置是否安全',
        level: RiskLevel.MEDIUM,
        status: 'warning',
        details: '无法读取SSH配置文件',
      };
    }
  }

  /**
   * 检查防火墙状态
   */
  private async checkFirewallStatus(): Promise<SecurityCheckItem> {
    try {
      // 检查ufw
      let { stdout } = await execAsync('which ufw 2>/dev/null || echo ""');
      if (stdout.trim()) {
        const { stdout: status } = await execAsync('ufw status 2>/dev/null || echo "inactive"');
        if (status.includes('active')) {
          return {
            id: 'firewall_status',
            name: '防火墙状态检查',
            description: '检查系统防火墙是否启用',
            level: RiskLevel.LOW,
            status: 'pass',
            details: 'UFW防火墙已启用',
          };
        }
      }

      // 检查firewalld
      ({ stdout } = await execAsync('which firewall-cmd 2>/dev/null || echo ""'));
      if (stdout.trim()) {
        const { stdout: status } = await execAsync('firewall-cmd --state 2>/dev/null || echo "not running"');
        if (status.includes('running')) {
          return {
            id: 'firewall_status',
            name: '防火墙状态检查',
            description: '检查系统防火墙是否启用',
            level: RiskLevel.LOW,
            status: 'pass',
            details: 'Firewalld防火墙已启用',
          };
        }
      }

      return {
        id: 'firewall_status',
        name: '防火墙状态检查',
        description: '检查系统防火墙是否启用',
        level: RiskLevel.HIGH,
        status: 'fail',
        suggestion: '建议启用系统防火墙以保护服务器安全',
      };
    } catch (error) {
      return {
        id: 'firewall_status',
        name: '防火墙状态检查',
        description: '检查系统防火墙是否启用',
        level: RiskLevel.MEDIUM,
        status: 'warning',
        details: '无法检测防火墙状态',
      };
    }
  }

  /**
   * 检查系统更新
   */
  private async checkSystemUpdates(): Promise<SecurityCheckItem> {
    try {
      // Ubuntu/Debian
      const { stdout } = await execAsync('apt list --upgradable 2>/dev/null | wc -l || echo "0"');
      const updateCount = parseInt(stdout.trim()) - 1; // 减去标题行

      if (updateCount > 10) {
        return {
          id: 'system_updates',
          name: '系统更新检查',
          description: '检查系统是否有待更新的软件包',
          level: RiskLevel.MEDIUM,
          status: 'warning',
          suggestion: `有 ${updateCount} 个软件包待更新，建议及时更新系统`,
          details: `待更新软件包数: ${updateCount}`,
        };
      }

      return {
        id: 'system_updates',
        name: '系统更新检查',
        description: '检查系统是否有待更新的软件包',
        level: RiskLevel.LOW,
        status: 'pass',
        details: '系统软件包较新',
      };
    } catch (error) {
      return {
        id: 'system_updates',
        name: '系统更新检查',
        description: '检查系统是否有待更新的软件包',
        level: RiskLevel.LOW,
        status: 'warning',
        details: '无法检测系统更新状态',
      };
    }
  }

  /**
   * 检查弱密码用户
   */
  private async checkWeakPasswords(): Promise<SecurityCheckItem> {
    // 这里只做基础检查，实际生产环境需要更复杂的密码策略检查
    return {
      id: 'weak_passwords',
      name: '弱密码检查',
      description: '检查系统用户是否使用弱密码',
      level: RiskLevel.MEDIUM,
      status: 'warning',
      suggestion: '建议定期检查并强制用户使用强密码策略',
      details: '建议使用密码复杂度要求：至少8位，包含大小写字母、数字和特殊字符',
    };
  }

  /**
   * 检查开放端口
   */
  private async checkOpenPorts(): Promise<SecurityCheckItem> {
    try {
      const { stdout } = await execAsync('ss -tuln | grep LISTEN | wc -l || echo "0"');
      const portCount = parseInt(stdout.trim());

      if (portCount > 20) {
        return {
          id: 'open_ports',
          name: '开放端口检查',
          description: '检查系统开放的网络端口',
          level: RiskLevel.MEDIUM,
          status: 'warning',
          suggestion: '开放端口较多，建议关闭不必要的服务',
          details: `当前开放端口数: ${portCount}`,
        };
      }

      return {
        id: 'open_ports',
        name: '开放端口检查',
        description: '检查系统开放的网络端口',
        level: RiskLevel.LOW,
        status: 'pass',
        details: `当前开放端口数: ${portCount}`,
      };
    } catch (error) {
      return {
        id: 'open_ports',
        name: '开放端口检查',
        description: '检查系统开放的网络端口',
        level: RiskLevel.LOW,
        status: 'warning',
        details: '无法检测开放端口',
      };
    }
  }

  /**
   * 检查可疑进程
   */
  private async checkSuspiciousProcesses(): Promise<SecurityCheckItem> {
    try {
      // 检查高CPU占用的进程
      const { stdout } = await execAsync('ps aux --sort=-%cpu | head -6 | tail -5');
      const processes = stdout.trim().split('\n');
      
      const suspiciousPatterns = ['miner', 'xmrig', 'cryptonight', 'malware'];
      const suspicious = processes.filter(proc => 
        suspiciousPatterns.some(pattern => proc.toLowerCase().includes(pattern))
      );

      if (suspicious.length > 0) {
        return {
          id: 'suspicious_processes',
          name: '可疑进程检查',
          description: '检查系统中是否存在可疑进程',
          level: RiskLevel.CRITICAL,
          status: 'fail',
          suggestion: '发现可疑进程，建议立即检查并终止',
          details: `可疑进程: ${suspicious.join(', ')}`,
        };
      }

      return {
        id: 'suspicious_processes',
        name: '可疑进程检查',
        description: '检查系统中是否存在可疑进程',
        level: RiskLevel.LOW,
        status: 'pass',
      };
    } catch (error) {
      return {
        id: 'suspicious_processes',
        name: '可疑进程检查',
        description: '检查系统中是否存在可疑进程',
        level: RiskLevel.LOW,
        status: 'warning',
        details: '无法检测进程状态',
      };
    }
  }

  /**
   * 检查文件权限
   */
  private async checkFilePermissions(): Promise<SecurityCheckItem> {
    try {
      // 检查关键文件权限
      const criticalFiles = ['/etc/passwd', '/etc/shadow', '/etc/ssh/sshd_config'];
      const issues: string[] = [];

      for (const file of criticalFiles) {
        try {
          const stats = await fs.stat(file);
          const mode = (stats.mode & parseInt('777', 8)).toString(8);
          
          // /etc/shadow 应该是 000 或 400
          if (file === '/etc/shadow' && mode !== '000' && mode !== '400') {
            issues.push(`${file} 权限过于宽松: ${mode}`);
          }
        } catch (error) {
          // 文件不存在或无权限访问
        }
      }

      if (issues.length > 0) {
        return {
          id: 'file_permissions',
          name: '文件权限检查',
          description: '检查关键系统文件权限',
          level: RiskLevel.HIGH,
          status: 'fail',
          suggestion: '发现权限配置不当的文件，建议修正',
          details: issues.join('; '),
        };
      }

      return {
        id: 'file_permissions',
        name: '文件权限检查',
        description: '检查关键系统文件权限',
        level: RiskLevel.LOW,
        status: 'pass',
      };
    } catch (error) {
      return {
        id: 'file_permissions',
        name: '文件权限检查',
        description: '检查关键系统文件权限',
        level: RiskLevel.LOW,
        status: 'warning',
        details: '无法检测文件权限',
      };
    }
  }

  /**
   * 检查系统日志异常
   */
  private async checkSystemLogs(): Promise<SecurityCheckItem> {
    try {
      // 检查最近的认证失败记录
      const { stdout } = await execAsync(
        'grep "Failed password" /var/log/auth.log 2>/dev/null | tail -100 | wc -l || echo "0"'
      );
      const failedCount = parseInt(stdout.trim());

      if (failedCount > 50) {
        return {
          id: 'system_logs',
          name: '系统日志异常检查',
          description: '检查系统日志中的异常记录',
          level: RiskLevel.HIGH,
          status: 'fail',
          suggestion: '检测到大量登录失败记录，可能存在暴力破解攻击',
          details: `最近100条日志中有 ${failedCount} 次登录失败`,
        };
      }

      return {
        id: 'system_logs',
        name: '系统日志异常检查',
        description: '检查系统日志中的异常记录',
        level: RiskLevel.LOW,
        status: 'pass',
      };
    } catch (error) {
      return {
        id: 'system_logs',
        name: '系统日志异常检查',
        description: '检查系统日志中的异常记录',
        level: RiskLevel.LOW,
        status: 'warning',
        details: '无法读取系统日志',
      };
    }
  }

  /**
   * 记录SSH登录尝试
   */
  recordLoginAttempt(ip: string, success: boolean): void {
    if (success) {
      // 成功登录，清除失败记录
      this.loginAttempts.delete(ip);
      return;
    }

    // 失败登录，增加计数
    const attempts = (this.loginAttempts.get(ip) || 0) + 1;
    this.loginAttempts.set(ip, attempts);

    // 达到阈值，自动封禁
    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      this.banIP(ip, `连续${attempts}次登录失败`, this.BAN_DURATION);
    }
  }

  /**
   * 封禁IP
   */
  banIP(ip: string, reason: string, duration?: number): void {
    const expiresAt = duration ? new Date(Date.now() + duration) : undefined;
    
    this.bannedIPs.set(ip, {
      ip,
      reason,
      bannedAt: new Date(),
      expiresAt,
      failedAttempts: this.loginAttempts.get(ip) || 0,
    });

    // 执行系统级封禁（使用iptables）
    this.executeIPBan(ip).catch(console.error);

    // 清除登录尝试记录
    this.loginAttempts.delete(ip);
  }

  /**
   * 执行系统级IP封禁
   */
  private async executeIPBan(ip: string): Promise<void> {
    try {
      // 使用iptables封禁IP
      await execAsync(`iptables -I INPUT -s ${ip} -j DROP 2>/dev/null || true`);
    } catch (error) {
      console.error(`Failed to ban IP ${ip}:`, error);
    }
  }

  /**
   * 解除IP封禁
   */
  async unbanIP(ip: string): Promise<void> {
    this.bannedIPs.delete(ip);
    
    try {
      // 从iptables中移除封禁
      await execAsync(`iptables -D INPUT -s ${ip} -j DROP 2>/dev/null || true`);
    } catch (error) {
      console.error(`Failed to unban IP ${ip}:`, error);
    }
  }

  /**
   * 检查IP是否被封禁
   */
  isIPBanned(ip: string): boolean {
    const ban = this.bannedIPs.get(ip);
    if (!ban) return false;

    // 检查是否过期
    if (ban.expiresAt && ban.expiresAt < new Date()) {
      this.unbanIP(ip);
      return false;
    }

    return true;
  }

  /**
   * 获取所有封禁的IP
   */
  getBannedIPs(): IPBanRecord[] {
    return Array.from(this.bannedIPs.values());
  }

  /**
   * 清理过期的封禁记录
   */
  cleanExpiredBans(): void {
    const now = new Date();
    const ipsToUnban: string[] = [];
    
    this.bannedIPs.forEach((ban, ip) => {
      if (ban.expiresAt && ban.expiresAt < now) {
        ipsToUnban.push(ip);
      }
    });
    
    ipsToUnban.forEach(ip => this.unbanIP(ip));
  }
}

// 全局安全管理器实例
export const securityManager = new SecurityManager();

// 每10分钟清理一次过期封禁
setInterval(() => {
  securityManager.cleanExpiredBans();
}, 10 * 60 * 1000);
