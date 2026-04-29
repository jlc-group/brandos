CREATE TABLE `ads_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_history_id` int,
	`performance_data_id` int,
	`action` enum('scale','stop','create_variation','test','monitor') NOT NULL,
	`reason` text NOT NULL,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`ai_analysis` text,
	`status` enum('pending','applied','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ads_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anti_annoy_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_date` timestamp NOT NULL DEFAULT (now()),
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`overall_score` float DEFAULT 0,
	`sale_ratio` float DEFAULT 0,
	`education_ratio` float DEFAULT 0,
	`entertainment_ratio` float DEFAULT 0,
	`review_ratio` float DEFAULT 0,
	`lifestyle_ratio` float DEFAULT 0,
	`repeat_hook_count` int DEFAULT 0,
	`repeat_sku_count` int DEFAULT 0,
	`ai_insights` text,
	`recommendations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anti_annoy_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`value` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_calendar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduled_date` timestamp NOT NULL,
	`sku_id` int,
	`content_type` varchar(64) NOT NULL,
	`objective` varchar(64) NOT NULL,
	`title` varchar(500) NOT NULL,
	`hook` text,
	`caption` text,
	`cover_concept` text,
	`platform` varchar(32) NOT NULL DEFAULT 'tiktok',
	`status` enum('planned','in_progress','published','cancelled') NOT NULL DEFAULT 'planned',
	`ads_mode` enum('organic','test','scale','none') NOT NULL DEFAULT 'none',
	`notes` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_calendar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calendar_id` int,
	`sku_id` int,
	`platform` varchar(32) NOT NULL DEFAULT 'tiktok',
	`content_type` varchar(64) NOT NULL,
	`title` varchar(500) NOT NULL,
	`hook` text,
	`caption` text,
	`cover_concept` text,
	`published_date` timestamp,
	`external_id` varchar(255),
	`external_url` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku_id` int NOT NULL,
	`content_type` varchar(64) NOT NULL,
	`content_role` text,
	`hook_style` text,
	`example_ideas` text,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_matrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_history_id` int,
	`external_id` varchar(255),
	`platform` varchar(32) NOT NULL DEFAULT 'tiktok',
	`data_date` timestamp NOT NULL,
	`views` int DEFAULT 0,
	`reach` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`saves` int DEFAULT 0,
	`avg_watch_time` float DEFAULT 0,
	`completion_rate` float DEFAULT 0,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`ctr` float DEFAULT 0,
	`spend` float DEFAULT 0,
	`revenue` float DEFAULT 0,
	`roas` float DEFAULT 0,
	`cpa` float DEFAULT 0,
	`conversions` int DEFAULT 0,
	`import_source` varchar(32) DEFAULT 'manual',
	`raw_data` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255),
	`category` varchar(64) NOT NULL,
	`description` text,
	`key_benefit` text,
	`target_audience` text,
	`price_range` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skus_id` PRIMARY KEY(`id`)
);
