import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("websites", () => {
  it("allows authenticated users to list websites", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.websites.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to create website", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.websites.create({
      name: "Test Website",
      domain: "test.example.com",
      path: "/var/www/test",
      port: 8080,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("prevents non-admin from creating website", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.websites.create({
        name: "Test Website",
        domain: "test.example.com",
        path: "/var/www/test",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("databases", () => {
  it("allows authenticated users to list databases", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.databases.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to create database", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.databases.create({
      name: "test_db_" + Date.now(),
      username: "testuser",
      password: "testpass123",
    });

    expect(result.success).toBe(true);
  });

  it("prevents non-admin from creating database", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.databases.create({
        name: "test_db",
        username: "testuser",
        password: "testpass123",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("firewall", () => {
  it("allows authenticated users to list firewall rules", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.firewall.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to create firewall rule", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.firewall.create({
      name: "Test Rule",
      port: 8080,
      protocol: "tcp",
      action: "allow",
    });

    expect(result.success).toBe(true);
  });

  it("prevents non-admin from creating firewall rule", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.firewall.create({
        name: "Test Rule",
        port: 8080,
        protocol: "tcp",
        action: "allow",
      })
    ).rejects.toThrow("Admin access required");
  });
});
