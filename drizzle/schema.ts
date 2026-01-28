import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Websites managed by the panel
 */
export const websites = mysqlTable("websites", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  path: text("path").notNull(),
  port: int("port"),
  sslEnabled: boolean("sslEnabled").default(false).notNull(),
  sslCertPath: text("sslCertPath"),
  sslKeyPath: text("sslKeyPath"),
  status: mysqlEnum("status", ["running", "stopped", "error"]).default("stopped").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Website = typeof websites.$inferSelect;
export type InsertWebsite = typeof websites.$inferInsert;

/**
 * Databases managed by the panel
 */
export const databases = mysqlTable("databases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  password: text("password").notNull(),
  host: varchar("host", { length: 255 }).default("localhost").notNull(),
  port: int("port").default(3306).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Database = typeof databases.$inferSelect;
export type InsertDatabase = typeof databases.$inferInsert;

/**
 * Firewall rules for security management
 */
export const firewallRules = mysqlTable("firewallRules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  port: int("port").notNull(),
  protocol: mysqlEnum("protocol", ["tcp", "udp", "both"]).default("tcp").notNull(),
  action: mysqlEnum("action", ["allow", "deny"]).default("allow").notNull(),
  sourceIp: varchar("sourceIp", { length: 255 }),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FirewallRule = typeof firewallRules.$inferSelect;
export type InsertFirewallRule = typeof firewallRules.$inferInsert;

/**
 * IP access control list
 */
export const ipWhitelist = mysqlTable("ipWhitelist", {
  id: int("id").autoincrement().primaryKey(),
  ipAddress: varchar("ipAddress", { length: 255 }).notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IpWhitelist = typeof ipWhitelist.$inferSelect;
export type InsertIpWhitelist = typeof ipWhitelist.$inferInsert;

/**
 * Operation logs for audit trail
 */
export const operationLogs = mysqlTable("operationLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  resource: varchar("resource", { length: 255 }).notNull(),
  resourceId: varchar("resourceId", { length: 255 }),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 255 }),
  status: mysqlEnum("status", ["success", "failed"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * File metadata for file management
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  path: text("path").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: varchar("mimeType", { length: 255 }),
  permissions: varchar("permissions", { length: 10 }),
  owner: varchar("owner", { length: 255 }),
  isDirectory: boolean("isDirectory").default(false).notNull(),
  parentPath: text("parentPath"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Server connections for deployment
 */
export const serverConnections = mysqlTable("serverConnections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").default(22).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  authType: mysqlEnum("authType", ["password", "key"]).default("password").notNull(),
  password: text("password"),
  privateKey: text("privateKey"),
  status: mysqlEnum("status", ["connected", "disconnected", "error"]).default("disconnected").notNull(),
  lastConnected: timestamp("lastConnected"),
  description: text("description"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServerConnection = typeof serverConnections.$inferSelect;
export type InsertServerConnection = typeof serverConnections.$inferInsert;

/**
 * Deployment history records
 */
export const deploymentHistory = mysqlTable("deploymentHistory", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  deployType: varchar("deployType", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "success", "failed"]).default("pending").notNull(),
  command: text("command"),
  output: text("output"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull(),
});

export type DeploymentHistory = typeof deploymentHistory.$inferSelect;
export type InsertDeploymentHistory = typeof deploymentHistory.$inferInsert;
