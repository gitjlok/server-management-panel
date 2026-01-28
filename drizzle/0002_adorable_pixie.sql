CREATE TABLE `deploymentHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`deployType` varchar(255) NOT NULL,
	`status` enum('pending','running','success','failed') NOT NULL DEFAULT 'pending',
	`command` text,
	`output` text,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdBy` int NOT NULL,
	CONSTRAINT `deploymentHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serverConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL DEFAULT 22,
	`username` varchar(255) NOT NULL,
	`authType` enum('password','key') NOT NULL DEFAULT 'password',
	`password` text,
	`privateKey` text,
	`status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`lastConnected` timestamp,
	`description` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serverConnections_id` PRIMARY KEY(`id`)
);
