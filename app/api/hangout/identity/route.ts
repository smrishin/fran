import { guests } from "../../../../data/trip";
import {
  ACCESS_COOKIE_NAME,
  HANGOUT_IDENTITY_COOKIE_NAME,
  HANGOUT_IDENTITY_DURATION_SECONDS,
  createHangoutIdentityToken,
  readCookie,
  verifyAccessToken,
} from "../../../../lib/access";

function cookieHeader(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${HANGOUT_IDENTITY_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function POST(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  const body = await request.json() as { playerId?: unknown };
  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  if (!guests.some((guest) => guest.id === playerId)) return Response.json({ error: "Choose a valid trip member." }, { status: 400 });

  const token = await createHangoutIdentityToken(playerId);
  return Response.json({ playerId }, {
    headers: {
      "Cache-Control": "private, no-store",
      "Set-Cookie": cookieHeader(request, token, HANGOUT_IDENTITY_DURATION_SECONDS),
    },
  });
}

export async function DELETE(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });
  return Response.json({ ok: true }, {
    headers: {
      "Cache-Control": "private, no-store",
      "Set-Cookie": cookieHeader(request, "", 0),
    },
  });
}
