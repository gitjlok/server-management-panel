import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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

describe("monitor.getSystemInfo", () => {
  it("returns system information for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.monitor.getSystemInfo();

    expect(result).toBeDefined();
    expect(result.cpu).toBeDefined();
    expect(result.cpu.usage).toBeGreaterThanOrEqual(0);
    expect(result.cpu.usage).toBeLessThanOrEqual(100);
    expect(result.cpu.cores).toBeGreaterThan(0);
    
    expect(result.memory).toBeDefined();
    expect(result.memory.total).toBeGreaterThan(0);
    expect(result.memory.used).toBeGreaterThanOrEqual(0);
    expect(result.memory.free).toBeGreaterThanOrEqual(0);
    expect(result.memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(result.memory.usagePercent).toBeLessThanOrEqual(100);
    
    expect(result.disk).toBeDefined();
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.platform).toBeDefined();
    expect(result.hostname).toBeDefined();
    expect(result.loadAverage).toHaveLength(3);
  });
});

describe("monitor.getProcesses", () => {
  it("returns list of running processes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.monitor.getProcesses();

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const process = result[0];
      expect(process).toHaveProperty("user");
      expect(process).toHaveProperty("pid");
      expect(process).toHaveProperty("cpu");
      expect(process).toHaveProperty("mem");
      expect(process).toHaveProperty("command");
    }
  });
});
