CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatar_uri` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
