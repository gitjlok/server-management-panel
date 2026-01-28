import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { performanceCache, resourceMonitor } from "./performance";
import { securityManager } from "./security";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Performance Module", () => {
  beforeEach(() => {
    performanceCache.clearAll();
  });

  it("should cache and retrieve data correctly", () => {
    const testData = { value: "test", number: 123 };
    performanceCache.set("test-key", testData, 1000);

    const retrieved = performanceCache.get("test-key");
    expect(retrieved).toEqual(testData);
  });

  it("should return undefined for expired cache", async () => {
    performanceCache.set("expire-key", "test", 10); // 10ms TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const retrieved = performanceCache.get("expire-key");
    expect(retrieved).toBeUndefined();
  });

  it("should clear all cache", () => {
    performanceCache.set("key1", "value1", 1000);
    performanceCache.set("key2", "value2", 1000);
    
    performanceCache.clearAll();
    
    expect(performanceCache.get("key1")).toBeUndefined();
    expect(performanceCache.get("key2")).toBeUndefined();
  });

  it("should track resource usage", () => {
    resourceMonitor.recordRequest();
    resourceMonitor.recordRequest();
    resourceMonitor.recordError();

    const stats = resourceMonitor.getStats();
    
    expect(stats.requestCount).toBe(2);
    expect(stats.errorCount).toBe(1);
    expect(stats.uptime).toBeGreaterThanOrEqual(0);
    expect(stats.memory.rss).toBeGreaterThan(0);
  });
});

describe("Security Module", () => {
  beforeEach(() => {
    // Clear all banned IPs before each test
    const bannedIPs = securityManager.getBannedIPs();
    bannedIPs.forEach(ban => {
      securityManager.unbanIP(ban.ip);
    });
  });

  it("should ban and unban IP addresses", async () => {
    const testIP = "192.168.1.100";
    
    // Ban IP
    securityManager.banIP(testIP, "Test ban");
    expect(securityManager.isIPBanned(testIP)).toBe(true);
    
    // Unban IP
    await securityManager.unbanIP(testIP);
    expect(securityManager.isIPBanned(testIP)).toBe(false);
  });

  it("should auto-ban IP after failed login attempts", () => {
    const testIP = "192.168.1.101";
    
    // Simulate 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      securityManager.recordLoginAttempt(testIP, false);
    }
    
    expect(securityManager.isIPBanned(testIP)).toBe(true);
  });

  it("should clear failed attempts on successful login", () => {
    const testIP = "192.168.1.102";
    
    // Failed attempts
    securityManager.recordLoginAttempt(testIP, false);
    securityManager.recordLoginAttempt(testIP, false);
    
    // Successful login should clear attempts
    securityManager.recordLoginAttempt(testIP, true);
    
    // More failed attempts shouldn't trigger ban immediately
    securityManager.recordLoginAttempt(testIP, false);
    expect(securityManager.isIPBanned(testIP)).toBe(false);
  });

  it("should automatically expire temporary bans", async () => {
    const testIP = "192.168.1.103";
    
    // Ban for 100ms
    securityManager.banIP(testIP, "Temporary ban", 100);
    expect(securityManager.isIPBanned(testIP)).toBe(true);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Clean expired bans
    securityManager.cleanExpiredBans();
    
    expect(securityManager.isIPBanned(testIP)).toBe(false);
  });

  it("should run security checks", async () => {
    const results = await securityManager.runSecurityCheck();
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Check that each result has required fields
    results.forEach(check => {
      expect(check).toHaveProperty("id");
      expect(check).toHaveProperty("name");
      expect(check).toHaveProperty("description");
      expect(check).toHaveProperty("level");
      expect(check).toHaveProperty("status");
    });
  });
});

describe("Performance API", () => {
  it("should get performance stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.performance.getStats();

    expect(stats).toHaveProperty("uptime");
    expect(stats).toHaveProperty("requestCount");
    expect(stats).toHaveProperty("memory");
    expect(stats.memory).toHaveProperty("rss");
    expect(stats.memory).toHaveProperty("heapUsed");
  });

  it("should clear cache", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Add some cache
    performanceCache.set("test", "data", 1000);
    
    const result = await caller.performance.clearCache();

    expect(result.success).toBe(true);
    expect(performanceCache.get("test")).toBeUndefined();
  });
});

describe("Security API", () => {
  it("should run security check via API", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.security.runSecurityCheck();

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should ban IP via API", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const testIP = "10.0.0.1";
    const result = await caller.security.banIP({
      ip: testIP,
      reason: "API test",
      duration: 3600000, // 1 hour
    });

    expect(result.success).toBe(true);
    expect(securityManager.isIPBanned(testIP)).toBe(true);

    // Cleanup
    await securityManager.unbanIP(testIP);
  });

  it("should unban IP via API", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const testIP = "10.0.0.2";
    
    // Ban first
    securityManager.banIP(testIP, "Test");
    expect(securityManager.isIPBanned(testIP)).toBe(true);

    // Unban via API
    const result = await caller.security.unbanIP({ ip: testIP });

    expect(result.success).toBe(true);
    expect(securityManager.isIPBanned(testIP)).toBe(false);
  });

  it("should get banned IPs list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Ban some IPs
    securityManager.banIP("10.0.0.3", "Test 1");
    securityManager.banIP("10.0.0.4", "Test 2");

    const bannedIPs = await caller.security.getBannedIPs();

    expect(Array.isArray(bannedIPs)).toBe(true);
    expect(bannedIPs.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    await securityManager.unbanIP("10.0.0.3");
    await securityManager.unbanIP("10.0.0.4");
  });
});
