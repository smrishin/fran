import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
