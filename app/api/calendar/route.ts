import { parseIcs } from "../../../lib/ics";

export async function GET() {
  const configuredUrl = process.env.TRIP_CALENDAR_ICS_URL;

  if (!configuredUrl) {
    return Response.json({
      configured: false,
      events: [],
      message: "Add the public iCloud calendar link to enable live events.",
    });
  }

  const calendarUrl = configuredUrl.replace(/^webcal:/i, "https:");

  try {
    const response = await fetch(calendarUrl, {
      headers: { Accept: "text/calendar, text/plain;q=0.9" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) throw new Error(`Calendar returned ${response.status}`);
    const source = await response.text();
    if (source.length > 2_000_000) throw new Error("Calendar response is too large");

    return Response.json(
      { configured: true, events: parseIcs(source), syncedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json(
      { configured: true, events: [], message: "The calendar could not be refreshed. Try again shortly." },
      { status: 502 },
    );
  }
}
