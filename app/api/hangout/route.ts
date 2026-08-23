import {
  ACCESS_COOKIE_NAME,
  HANGOUT_IDENTITY_COOKIE_NAME,
  readCookie,
  verifyAccessToken,
  verifyHangoutIdentityToken,
} from "../../../lib/access";

async function playerIdFrom(request: Request) {
  const token = readCookie(request.headers.get("cookie"), HANGOUT_IDENTITY_COOKIE_NAME);
  return await verifyHangoutIdentityToken(token);
}

export async function GET(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  const playerId = await playerIdFrom(request);
  if (!playerId) return Response.json({ error: "Choose your player first." }, { status: 400 });

  const storage = await import("../../../lib/hangout-storage");
  try {
    return Response.json(await storage.getHangoutState(playerId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof storage.HangoutError ? error.status : 503;
    const message = error instanceof storage.HangoutError ? error.message : "Hangout is temporarily unavailable.";
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  const storage = await import("../../../lib/hangout-storage");
  try {
    const body = await request.json() as { action?: unknown; targetPlayerId?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    const targetPlayerId = typeof body.targetPlayerId === "string" ? body.targetPlayerId.trim() : "";
    const playerId = await playerIdFrom(request);
    if (!playerId) throw new storage.HangoutError("Choose your player first.");

    const actions: Record<string, () => Promise<unknown>> = {
      create: () => storage.createHangoutLobby(playerId),
      join: () => storage.joinHangoutLobby(playerId),
      leave: () => storage.leaveHangoutLobby(playerId),
      start: () => storage.startHangoutRound(playerId),
      next: () => storage.startHangoutRound(playerId),
      reveal: () => storage.revealHangoutRound(playerId),
      claimHost: () => storage.claimHangoutHost(playerId),
      remove: () => storage.removeHangoutPlayer(playerId, targetPlayerId),
      end: () => storage.endHangoutLobby(playerId),
    };
    const run = actions[action];
    if (!run) throw new storage.HangoutError("That Hangout action is not supported.");

    return Response.json(await run(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof storage.HangoutError ? error.status : 503;
    const message = error instanceof storage.HangoutError ? error.message : "Hangout is temporarily unavailable.";
    return Response.json({ error: message }, { status });
  }
}
