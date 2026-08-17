# California trip dashboard

A responsive, component-based trip dashboard built for a one-week California group trip. The current working brand is **Fog & Fire**; the name and visual direction are intentionally awaiting approval.

## Local development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Project shape

- `components/TripDashboard.tsx` contains the reusable dashboard views and cards.
- `data/trip.ts` is the single source for trip, itinerary, cost, and guest placeholder data.
- `app/api/calendar/route.ts` loads a public iCloud ICS feed without visitor authentication.
- `lib/ics.ts` normalizes the calendar feed into display-ready events.
- `app/globals.css` contains the responsive visual system.

## iCloud calendar

Create a dedicated trip calendar in iCloud, enable **Public Calendar**, and copy its sharing link. Add that URL to a local `.env` file:

```bash
TRIP_CALENDAR_ICS_URL=webcal://example.icloud.com/published/...
```

The server-side calendar route converts `webcal://` to HTTPS, fetches the read-only feed, and returns normalized event fields to the app. The public link is not placed in browser code. Anyone who has the original public link can still read the calendar, so keep sensitive information out of the trip calendar.

## Checks

```bash
npm run build
npm test
npm exec tsc -- --noEmit
```

No account system, user management, database, or deployment is included in this iteration.
