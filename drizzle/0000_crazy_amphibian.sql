CREATE TABLE `quest_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quest_completions_object_key_unique` ON `quest_completions` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quest_completions_task_player` ON `quest_completions` (`task_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_quest_completions_player` ON `quest_completions` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_quest_completions_completed_at` ON `quest_completions` (`completed_at`);