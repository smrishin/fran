CREATE TABLE `quest_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`completion_id` text NOT NULL,
	`position` integer NOT NULL,
	`object_key` text NOT NULL,
	`thumbnail_key` text,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`completion_id`) REFERENCES `quest_completions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quest_photos_object_key_unique` ON `quest_photos` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quest_photos_slot` ON `quest_photos` (`completion_id`,`position`);