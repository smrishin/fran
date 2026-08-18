import { ACCESS_COOKIE_NAME, readCookie, verifyAccessToken } from "../../../lib/access";

export async function GET(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  try {
    const { listQuestCompletions } = await import("../../../lib/quest-storage");
    return Response.json({ completions: await listQuestCompletions() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Quest progress is temporarily unavailable." }, { status: 503 });
  }
}
