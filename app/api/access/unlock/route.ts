import { ACCESS_COOKIE_NAME, ACCESS_DURATION_SECONDS, createAccessToken } from "../../../../lib/access";

export async function POST(request: Request) {
  let code = "";
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return Response.json({ ok: false, message: "Enter the Campfire Code." }, { status: 400 });
  }

  const expectedCode = process.env.TRIP_ACCESS_CODE;
  const cookieSecret = process.env.TRIP_ACCESS_COOKIE_SECRET;
  if (!expectedCode || !cookieSecret) {
    return Response.json({ ok: false, message: "Private access is not configured yet." }, { status: 503 });
  }

  if (code !== expectedCode) {
    return Response.json({ ok: false, message: "That Campfire Code doesn’t match. Try again." }, { status: 401 });
  }

  const token = await createAccessToken();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ACCESS_DURATION_SECONDS}${secure}`,
        "Cache-Control": "no-store",
      },
    },
  );
}
