import {
  ACCESS_COOKIE_NAME,
  HANGOUT_IDENTITY_COOKIE_NAME,
  readCookie,
  verifyAccessToken,
  verifyHangoutIdentityToken,
} from "../../../../lib/access";

export async function GET(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  const identityToken = readCookie(request.headers.get("cookie"), HANGOUT_IDENTITY_COOKIE_NAME);
  const playerId = await verifyHangoutIdentityToken(identityToken);
  if (!playerId) return Response.json({ error: "Choose your player first." }, { status: 400 });

  const storage = await import("../../../../lib/hangout-storage");
  try {
    return Response.json(await storage.getPrivateHangoutQuestion(playerId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof storage.HangoutError ? error.status : 503;
    const message = error instanceof storage.HangoutError ? error.message : "Your question is temporarily unavailable.";
    return Response.json({ error: message }, { status });
  }
}
