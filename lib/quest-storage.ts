import { env } from "cloudflare:workers";
import type { QuestCompletion } from "../data/quest";
import { deleteObject, getObject, putObject } from "./object-storage";

type QuestRow = {
  id: string;
  task_id: string;
  player_id: string;
  player_name: string;
  object_key: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  completed_at: string;
};

type QuestEnv = {
  DB: D1Database;
};

function bindings() {
  const runtime = env as unknown as QuestEnv;
  if (!runtime.DB) throw new Error("Quest storage is unavailable.");
  return runtime;
}

async function ensureQuestSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS quest_completions (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_completions_task_player ON quest_completions (task_id, player_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_quest_completions_player ON quest_completions (player_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_quest_completions_completed_at ON quest_completions (completed_at)"),
    db.prepare("PRAGMA optimize"),
  ]);
}

function publicCompletion(row: QuestRow): QuestCompletion {
  return {
    id: row.id,
    taskId: row.task_id,
    playerId: row.player_id,
    playerName: row.player_name,
    photoUrl: `/api/quest/photos/${encodeURIComponent(row.id)}`,
    completedAt: row.completed_at,
  };
}

export async function listQuestCompletions() {
  const { DB } = bindings();
  await ensureQuestSchema(DB);
  const result = await DB.prepare("SELECT * FROM quest_completions ORDER BY completed_at DESC, id DESC").all<QuestRow>();
  return result.results.map(publicCompletion);
}

export async function getQuestPhoto(id: string) {
  const { DB } = bindings();
  await ensureQuestSchema(DB);
  const row = await DB.prepare("SELECT * FROM quest_completions WHERE id = ? LIMIT 1").bind(id).first<QuestRow>();
  if (!row) return null;
  const object = await getObject(row.object_key);
  return object ? { object, row } : null;
}

export async function saveQuestProof(input: {
  taskId: string;
  playerId: string;
  playerName: string;
  file: File;
}) {
  const { DB } = bindings();
  await ensureQuestSchema(DB);

  const existing = await DB.prepare("SELECT id FROM quest_completions WHERE task_id = ? AND player_id = ? LIMIT 1")
    .bind(input.taskId, input.playerId)
    .first<{ id: string }>();
  if (existing) throw new Error("ALREADY_COMPLETED");

  const id = crypto.randomUUID();
  const extension = input.file.name.match(/\.[a-z0-9]{1,8}$/i)?.[0].toLowerCase() ?? "";
  const objectKey = `bingo/${input.taskId}/${input.playerId}/${Date.now()}-${id}${extension}`;
  const completedAt = new Date().toISOString();

  await putObject(objectKey, input.file.stream(), {
    httpMetadata: { contentType: input.file.type },
    customMetadata: {
      taskId: input.taskId,
      playerId: input.playerId,
      playerName: input.playerName,
      completedAt,
    },
  });

  try {
    await DB.prepare(`INSERT INTO quest_completions
      (id, task_id, player_id, player_name, object_key, file_name, content_type, byte_size, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, input.taskId, input.playerId, input.playerName, objectKey, input.file.name, input.file.type, input.file.size, completedAt)
      .run();
  } catch (error) {
    await deleteObject(objectKey);
    throw error;
  }

  return publicCompletion({
    id,
    task_id: input.taskId,
    player_id: input.playerId,
    player_name: input.playerName,
    object_key: objectKey,
    file_name: input.file.name,
    content_type: input.file.type,
    byte_size: input.file.size,
    completed_at: completedAt,
  });
}
