CREATE TABLE `bill_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_id` text NOT NULL,
	`month_key` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`paid_at` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bill_payments_bucket_month_idx` ON `bill_payments` (`bucket_id`,`month_key`);--> statement-breakpoint
ALTER TABLE `buckets` ADD `due_day` integer;