import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const questCompletions = sqliteTable("quest_completions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_quest_completions_task_player").on(table.taskId, table.playerId),
  index("idx_quest_completions_player").on(table.playerId),
  index("idx_quest_completions_completed_at").on(table.completedAt),
]);

export const hangoutLobbies = sqliteTable("hangout_lobbies", {
  id: text("id").primaryKey(),
  gameType: text("game_type").notNull(),
  hostPlayerId: text("host_player_id").notNull(),
  status: text("status", { enum: ["waiting", "active", "revealed", "closed"] }).notNull(),
  currentRoundId: text("current_round_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_hangout_lobbies_active_game").on(table.gameType).where(sql`${table.status} != 'closed'`),
]);

export const hangoutLobbyPlayers = sqliteTable("hangout_lobby_players", {
  lobbyId: text("lobby_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.lobbyId, table.playerId] }),
  index("idx_hangout_lobby_players_lobby").on(table.lobbyId, table.joinedAt),
]);

export const hangoutRounds = sqliteTable("hangout_rounds", {
  id: text("id").primaryKey(),
  lobbyId: text("lobby_id").notNull(),
  questionPairId: text("question_pair_id").notNull(),
  imposterPlayerId: text("imposter_player_id").notNull(),
  imposterPlayerName: text("imposter_player_name").notNull(),
  status: text("status", { enum: ["active", "revealed", "ended"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revealedAt: text("revealed_at"),
}, (table) => [
  index("idx_hangout_rounds_lobby_created").on(table.lobbyId, table.createdAt),
  uniqueIndex("idx_hangout_rounds_active_lobby").on(table.lobbyId).where(sql`${table.status} = 'active'`),
]);

export const hangoutRoundPlayers = sqliteTable("hangout_round_players", {
  roundId: text("round_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
}, (table) => [
  primaryKey({ columns: [table.roundId, table.playerId] }),
  index("idx_hangout_round_players_round").on(table.roundId),
]);
