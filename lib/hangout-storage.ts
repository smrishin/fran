import { env } from "cloudflare:workers";
import type { HangoutLobbyState, HangoutRoundState } from "../data/hangout";
import { guests, type Guest } from "../data/trip";
import { crossedWiresQuestionPairs } from "./crossed-wires-questions";

const GAME_TYPE = "crossed-wires";

type HangoutEnv = { DB: D1Database };
type LobbyStatus = "waiting" | "active" | "revealed" | "closed";
type RoundStatus = "active" | "revealed" | "ended";

type LobbyRow = {
  id: string;
  game_type: string;
  host_player_id: string;
  status: LobbyStatus;
  current_round_id: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  lobby_id: string;
  player_id: string;
  player_name: string;
  joined_at: string;
};

type RoundRow = {
  id: string;
  lobby_id: string;
  question_pair_id: string;
  imposter_player_id: string;
  imposter_player_name: string;
  status: RoundStatus;
  created_at: string;
  revealed_at: string | null;
};

export class HangoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function bindings() {
  const runtime = env as unknown as HangoutEnv;
  if (!runtime.DB) throw new HangoutError("Hangout is temporarily unavailable.", 503);
  return runtime;
}

export async function ensureHangoutSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS hangout_lobbies (
      id TEXT PRIMARY KEY NOT NULL,
      game_type TEXT NOT NULL,
      host_player_id TEXT NOT NULL,
      status TEXT NOT NULL,
      current_round_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS hangout_lobby_players (
      lobby_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (lobby_id, player_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS hangout_rounds (
      id TEXT PRIMARY KEY NOT NULL,
      lobby_id TEXT NOT NULL,
      question_pair_id TEXT NOT NULL,
      imposter_player_id TEXT NOT NULL,
      imposter_player_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revealed_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS hangout_round_players (
      round_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      PRIMARY KEY (round_id, player_id)
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_hangout_lobbies_active_game ON hangout_lobbies (game_type) WHERE status != 'closed'"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_hangout_lobby_players_lobby ON hangout_lobby_players (lobby_id, joined_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_hangout_rounds_lobby_created ON hangout_rounds (lobby_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_hangout_rounds_active_lobby ON hangout_rounds (lobby_id) WHERE status = 'active'"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_hangout_round_players_round ON hangout_round_players (round_id)"),
    db.prepare("PRAGMA optimize"),
  ]);
}

function knownPlayer(playerId: string): Guest {
  const player = guests.find((guest) => guest.id === playerId);
  if (!player) throw new HangoutError("Choose a valid trip member.");
  return player;
}

async function activeLobby(db: D1Database) {
  return db.prepare("SELECT * FROM hangout_lobbies WHERE game_type = ? AND status != 'closed' ORDER BY created_at DESC LIMIT 1")
    .bind(GAME_TYPE)
    .first<LobbyRow>();
}

async function lobbyMembers(db: D1Database, lobbyId: string) {
  const result = await db.prepare("SELECT * FROM hangout_lobby_players WHERE lobby_id = ? ORDER BY joined_at ASC, player_id ASC")
    .bind(lobbyId)
    .all<MemberRow>();
  return result.results;
}

async function currentRound(db: D1Database, roundId: string | null) {
  if (!roundId) return null;
  return db.prepare("SELECT * FROM hangout_rounds WHERE id = ? LIMIT 1").bind(roundId).first<RoundRow>();
}

function publicRound(round: RoundRow | null): HangoutRoundState | null {
  if (!round || round.status === "ended") return null;
  const questionPair = crossedWiresQuestionPairs.find((pair) => pair.id === round.question_pair_id);
  if (!questionPair) throw new HangoutError("This round's questions are unavailable.", 503);
  return {
    id: round.id,
    status: round.status,
    createdAt: round.created_at,
    ...(round.status === "revealed" ? {
      reveal: {
        mainQuestion: questionPair.mainQuestion,
        differentQuestion: questionPair.imposterQuestion,
        differentPlayerName: round.imposter_player_name,
      },
    } : {}),
  };
}

export async function getHangoutState(playerId: string): Promise<HangoutLobbyState> {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby) {
    return { lobby: null, viewer: { isMember: false, isHost: false, canJoin: false, canLeave: false } };
  }

  const [members, round] = await Promise.all([
    lobbyMembers(DB, lobby.id),
    currentRound(DB, lobby.current_round_id),
  ]);
  const isMember = members.some((member) => member.player_id === playerId);
  const isHost = isMember && lobby.host_player_id === playerId;
  return {
    lobby: {
      id: lobby.id,
      gameType: lobby.game_type,
      status: lobby.status === "closed" ? "waiting" : lobby.status,
      hostPlayerId: lobby.host_player_id,
      members: members.map((member) => ({
        playerId: member.player_id,
        playerName: member.player_name,
        isHost: member.player_id === lobby.host_player_id,
      })),
      currentRound: publicRound(round),
      createdAt: lobby.created_at,
    },
    viewer: {
      isMember,
      isHost,
      canJoin: !isMember && lobby.status !== "active",
      canLeave: isMember && lobby.status !== "active",
    },
  };
}

export async function createHangoutLobby(playerId: string) {
  const player = knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  if (await activeLobby(DB)) throw new HangoutError("A Crossed Wires lobby is already open.", 409);
  const lobbyId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await DB.batch([
      DB.prepare("INSERT INTO hangout_lobbies (id, game_type, host_player_id, status, created_at, updated_at) VALUES (?, ?, ?, 'waiting', ?, ?)")
        .bind(lobbyId, GAME_TYPE, player.id, now, now),
      DB.prepare("INSERT INTO hangout_lobby_players (lobby_id, player_id, player_name, joined_at) VALUES (?, ?, ?, ?)")
        .bind(lobbyId, player.id, player.name, now),
    ]);
  } catch {
    throw new HangoutError("A Crossed Wires lobby is already open.", 409);
  }
  return getHangoutState(playerId);
}

export async function joinHangoutLobby(playerId: string) {
  const player = knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby) throw new HangoutError("There is no open game to join.", 404);
  if (lobby.status === "active") throw new HangoutError("A round is in progress. Join when it is revealed.", 409);
  await DB.prepare("INSERT OR IGNORE INTO hangout_lobby_players (lobby_id, player_id, player_name, joined_at) VALUES (?, ?, ?, ?)")
    .bind(lobby.id, player.id, player.name, new Date().toISOString())
    .run();
  return getHangoutState(playerId);
}

export async function leaveHangoutLobby(playerId: string) {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby) throw new HangoutError("There is no open game.", 404);
  if (lobby.status === "active") throw new HangoutError("Finish this round before leaving.", 409);
  const members = await lobbyMembers(DB, lobby.id);
  if (!members.some((member) => member.player_id === playerId)) throw new HangoutError("You are not in this lobby.", 409);
  const remaining = members.filter((member) => member.player_id !== playerId);
  const statements = [DB.prepare("DELETE FROM hangout_lobby_players WHERE lobby_id = ? AND player_id = ?").bind(lobby.id, playerId)];
  if (!remaining.length) {
    statements.push(DB.prepare("UPDATE hangout_lobbies SET status = 'closed', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), lobby.id));
  } else if (lobby.host_player_id === playerId) {
    statements.push(DB.prepare("UPDATE hangout_lobbies SET host_player_id = ?, updated_at = ? WHERE id = ?").bind(remaining[0].player_id, new Date().toISOString(), lobby.id));
  }
  await DB.batch(statements);
  return getHangoutState(playerId);
}

function secureRandomIndex(length: number) {
  if (length < 1) throw new HangoutError("Random selection needs at least one option.", 503);
  const range = 0x1_0000_0000;
  const ceiling = range - (range % length);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0]! >= ceiling);
  return value[0]! % length;
}

export async function startHangoutRound(playerId: string) {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby) throw new HangoutError("Create a lobby first.", 404);
  if (lobby.host_player_id !== playerId) throw new HangoutError("Only the host can start a round.", 403);
  if (lobby.status === "active") throw new HangoutError("This round is already active.", 409);
  const members = await lobbyMembers(DB, lobby.id);
  if (members.length < 3) throw new HangoutError("You need at least 3 players to start.", 409);

  const questionPair = crossedWiresQuestionPairs[secureRandomIndex(crossedWiresQuestionPairs.length)]!;
  const imposter = members[secureRandomIndex(members.length)]!;
  const roundId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await DB.batch([
      DB.prepare("INSERT INTO hangout_rounds (id, lobby_id, question_pair_id, imposter_player_id, imposter_player_name, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)")
        .bind(roundId, lobby.id, questionPair.id, imposter.player_id, imposter.player_name, now),
      ...members.map((member) => DB.prepare("INSERT INTO hangout_round_players (round_id, player_id, player_name) VALUES (?, ?, ?)")
        .bind(roundId, member.player_id, member.player_name)),
      DB.prepare("UPDATE hangout_lobbies SET status = 'active', current_round_id = ?, updated_at = ? WHERE id = ? AND status != 'active'")
        .bind(roundId, now, lobby.id),
    ]);
  } catch {
    throw new HangoutError("The round already started. Refreshing the lobby will catch you up.", 409);
  }
  return getHangoutState(playerId);
}

export async function revealHangoutRound(playerId: string) {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby || !lobby.current_round_id) throw new HangoutError("There is no active round.", 404);
  if (lobby.host_player_id !== playerId) throw new HangoutError("Only the host can reveal the round.", 403);
  if (lobby.status !== "active") throw new HangoutError("This round is not active.", 409);
  const now = new Date().toISOString();
  await DB.batch([
    DB.prepare("UPDATE hangout_rounds SET status = 'revealed', revealed_at = ? WHERE id = ? AND status = 'active'").bind(now, lobby.current_round_id),
    DB.prepare("UPDATE hangout_lobbies SET status = 'revealed', updated_at = ? WHERE id = ? AND status = 'active'").bind(now, lobby.id),
  ]);
  return getHangoutState(playerId);
}

export async function endHangoutLobby(playerId: string) {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby) throw new HangoutError("There is no open game.", 404);
  if (lobby.host_player_id !== playerId) throw new HangoutError("Only the host can end the game.", 403);
  const now = new Date().toISOString();
  const statements = [DB.prepare("UPDATE hangout_lobbies SET status = 'closed', updated_at = ? WHERE id = ?").bind(now, lobby.id)];
  if (lobby.current_round_id && lobby.status === "active") {
    statements.unshift(DB.prepare("UPDATE hangout_rounds SET status = 'ended' WHERE id = ? AND status = 'active'").bind(lobby.current_round_id));
  }
  await DB.batch(statements);
  return getHangoutState(playerId);
}

export async function getPrivateHangoutQuestion(playerId: string) {
  knownPlayer(playerId);
  const { DB } = bindings();
  await ensureHangoutSchema(DB);
  const lobby = await activeLobby(DB);
  if (!lobby || !lobby.current_round_id) throw new HangoutError("There is no active round.", 404);
  const round = await currentRound(DB, lobby.current_round_id);
  if (!round || round.status === "ended") throw new HangoutError("There is no active round.", 404);
  const participant = await DB.prepare("SELECT player_id FROM hangout_round_players WHERE round_id = ? AND player_id = ? LIMIT 1")
    .bind(round.id, playerId)
    .first<{ player_id: string }>();
  if (!participant) throw new HangoutError("You are not part of this round.", 403);
  const pair = crossedWiresQuestionPairs.find((item) => item.id === round.question_pair_id);
  if (!pair) throw new HangoutError("This round's question is unavailable.", 503);
  return { roundId: round.id, question: playerId === round.imposter_player_id ? pair.imposterQuestion : pair.mainQuestion };
}
