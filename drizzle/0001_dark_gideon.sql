CREATE TABLE `hangout_lobbies` (
	`id` text PRIMARY KEY NOT NULL,
	`game_type` text NOT NULL,
	`host_player_id` text NOT NULL,
	`status` text NOT NULL,
	`current_round_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hangout_lobbies_active_game` ON `hangout_lobbies` (`game_type`) WHERE "hangout_lobbies"."status" != 'closed';--> statement-breakpoint
CREATE TABLE `hangout_lobby_players` (
	`lobby_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`lobby_id`, `player_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_hangout_lobby_players_lobby` ON `hangout_lobby_players` (`lobby_id`,`joined_at`);--> statement-breakpoint
CREATE TABLE `hangout_round_players` (
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	PRIMARY KEY(`round_id`, `player_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_hangout_round_players_round` ON `hangout_round_players` (`round_id`);--> statement-breakpoint
CREATE TABLE `hangout_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`lobby_id` text NOT NULL,
	`question_pair_id` text NOT NULL,
	`imposter_player_id` text NOT NULL,
	`imposter_player_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revealed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_hangout_rounds_lobby_created` ON `hangout_rounds` (`lobby_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hangout_rounds_active_lobby` ON `hangout_rounds` (`lobby_id`) WHERE "hangout_rounds"."status" = 'active';