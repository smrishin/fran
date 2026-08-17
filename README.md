# Fog & Fire trip dashboard

A responsive, private dashboard for the October 24–November 1, 2026 California group trip.

The dashboard includes date-aware trip status cards, a device-persistent light/dark theme, and an installable web-app manifest with dedicated favicon, Apple touch, and maskable phone icons.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment settings

- `TRIP_CALENDAR_ICS_URL`: the read-only public iCloud calendar feed.
- `TRIP_ACCESS_CODE`: the shared Campfire Code visitors enter.
- `TRIP_ACCESS_COOKIE_SECRET`: a long random value used to sign seven-day access cookies.

Keep real values in `.env.local`, which is ignored by Git. Before a future Sites deployment, add the same values through the hosted environment settings rather than committing them.

## Project shape

- `components/TripDashboard.tsx` contains the responsive dashboard views and reusable cards.
- `components/AccessGate.tsx` contains the Campfire Code entry experience.
- `data/trip.ts` is the single source for the itinerary, guest list, and flights.
- `app/api/access/unlock/route.ts` validates the code server-side and issues the signed, HTTP-only access cookie.
- `app/api/calendar/route.ts` serves calendar data only after a valid access cookie.
- `lib/ics.ts` normalizes the iCloud feed into display-ready events.
- `lib/access.ts` creates and verifies time-limited access tokens.

Booking confirmation and agency reference numbers are deliberately excluded from the app.

## Checks

```bash
npm run build
npm test
npm run lint
npm exec tsc -- --noEmit
```

No account system, user management, database, or deployment is included.
