import { ACCESS_COOKIE_NAME, readCookie, verifyAccessToken } from "../../../../../lib/access";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return new Response("Campfire Code required.", { status: 401 });

  const { id } = await context.params;
  const { getQuestPhoto } = await import("../../../../../lib/quest-storage");
  const result = await getQuestPhoto(id, new URL(request.url).searchParams.get("thumbnail") === "1");
  if (!result) return new Response("Photo not found.", { status: 404 });

  const headers = new Headers();
  result.object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-cache");
  headers.set("Content-Disposition", "inline");
  return new Response(result.object.body, { headers });
}
