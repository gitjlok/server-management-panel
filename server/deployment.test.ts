import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

  const ctx: TrpcContext = {
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

  return ctx;
}

describe("deployment.listServers", () => {
  it("returns server list for authenticated users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.listServers();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("deployment.createServer", () => {
  it("creates a new server connection with valid data", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const serverData = {
      name: "Test Server",
      host: "192.168.1.100",
      port: 22,
      username: "root",
      authType: "password" as const,
      password: "test123",
      description: "Test server connection",
    };

    const result = await caller.deployment.createServer(serverData);

    expect(result).toEqual({ success: true });
  });
});

describe("deployment.getHistory", () => {
  it("returns deployment history", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.getHistory({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters deployment history by server ID", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.getHistory({ serverId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});
