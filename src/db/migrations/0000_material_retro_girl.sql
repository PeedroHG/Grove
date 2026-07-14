CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`institution` text,
	`pluggy_item_id` text,
	`pluggy_account_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `allocation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`income_source_id` text NOT NULL,
	`bucket_id` text NOT NULL,
	`mode` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`kind` text NOT NULL,
	`funding_type` text NOT NULL,
	`monthly_target_cents` integer,
	`is_reserve` integer DEFAULT false NOT NULL,
	`physical_location` text DEFAULT 'checking' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`merchant_raw` text,
	`occurred_at` integer NOT NULL,
	`source` text NOT NULL,
	`is_credit` integer DEFAULT false NOT NULL,
	`confidence` integer,
	`review_status` text DEFAULT 'confirmed' NOT NULL,
	`pluggy_transaction_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_pluggy_transaction_id_unique` ON `expenses` (`pluggy_transaction_id`);--> statement-breakpoint
CREATE TABLE `income_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`income_source_id` text,
	`amount_cents` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`source` text NOT NULL,
	`pluggy_transaction_id` text,
	`narrated` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `income_events_pluggy_transaction_id_unique` ON `income_events` (`pluggy_transaction_id`);--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`account_id` text NOT NULL,
	`reliability` text NOT NULL,
	`match_hint` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`entry_type` text NOT NULL,
	`event_type` text NOT NULL,
	`event_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_bucket_occurred_idx` ON `ledger_entries` (`bucket_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `merchant_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_normalized` text NOT NULL,
	`bucket_id` text NOT NULL,
	`hit_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_rules_merchant_normalized_unique` ON `merchant_rules` (`merchant_normalized`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_bucket_id` text NOT NULL,
	`to_bucket_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`reason` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`from_bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
