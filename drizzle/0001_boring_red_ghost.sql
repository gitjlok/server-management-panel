CREATE TABLE `databases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`host` varchar(255) NOT NULL DEFAULT 'localhost',
	`port` int NOT NULL DEFAULT 3306,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `databases_id` PRIMARY KEY(`id`),
	CONSTRAINT `databases_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`path` text NOT NULL,
	`size` bigint NOT NULL,
	`mimeType` varchar(255),
	`permissions` varchar(10),
	`owner` varchar(255),
	`isDirectory` boolean NOT NULL DEFAULT false,
	`parentPath` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firewallRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`protocol` enum('tcp','udp','both') NOT NULL DEFAULT 'tcp',
	`action` enum('allow','deny') NOT NULL DEFAULT 'allow',
	`sourceIp` varchar(255),
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `firewallRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ipWhitelist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipAddress` varchar(255) NOT NULL,
	`description` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ipWhitelist_id` PRIMARY KEY(`id`),
	CONSTRAINT `ipWhitelist_ipAddress_unique` UNIQUE(`ipAddress`)
);
--> statement-breakpoint
CREATE TABLE `operationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`resource` varchar(255) NOT NULL,
	`resourceId` varchar(255),
	`details` text,
	`ipAddress` varchar(255),
	`status` enum('success','failed') NOT NULL DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `websites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`path` text NOT NULL,
	`port` int,
	`sslEnabled` boolean NOT NULL DEFAULT false,
	`sslCertPath` text,
	`sslKeyPath` text,
	`status` enum('running','stopped','error') NOT NULL DEFAULT 'stopped',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `websites_id` PRIMARY KEY(`id`)
);
