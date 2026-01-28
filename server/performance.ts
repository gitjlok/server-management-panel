/**
 * 性能优化模块
 * 实现系统监控数据缓存，降低CPU和内存占用
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class PerformanceCache {
  private cache: Map<string, CachedData<any>> = new Map();

  /**
   * 获取缓存数据，如果过期则返回undefined
   */
  get<T = any>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 清除指定key的缓存
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((cached, key) => {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// 全局缓存实例
export const performanceCache = new PerformanceCache();

// 每5分钟清理一次过期缓存
setInterval(() => {
  performanceCache.cleanExpired();
}, 5 * 60 * 1000);

/**
 * 系统监控数据缓存配置
 * 根据宝塔面板的优化经验，合理设置缓存时间
 */
export const CACHE_CONFIG = {
  SYSTEM_INFO: 3000, // 系统信息缓存3秒
  CPU_USAGE: 2000, // CPU使用率缓存2秒
  MEMORY_USAGE: 2000, // 内存使用率缓存2秒
  DISK_USAGE: 5000, // 磁盘使用率缓存5秒
  NETWORK_STATS: 2000, // 网络统计缓存2秒
  PROCESS_LIST: 3000, // 进程列表缓存3秒
  WEBSITE_LIST: 10000, // 网站列表缓存10秒
  DATABASE_LIST: 10000, // 数据库列表缓存10秒
};

/**
 * 装饰器：为函数添加缓存功能
 */
export function cached(cacheKey: string, ttl: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成包含参数的缓存key
      const key = `${cacheKey}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cachedResult = performanceCache.get(key);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // 执行原始方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      performanceCache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 资源使用监控
 * 监控面板自身的资源占用
 */
export class ResourceMonitor {
  private startTime: number = Date.now();
  private requestCount: number = 0;
  private errorCount: number = 0;

  /**
   * 记录请求
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * 记录错误
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    return {
      uptime: Math.floor(uptime / 1000), // 秒
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      memory: {
        rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.floor(memoryUsage.external / 1024 / 1024), // MB
      },
      cacheSize: performanceCache['cache'].size,
    };
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }
}

export const resourceMonitor = new ResourceMonitor();
