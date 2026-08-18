"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { guests, itinerary, trip, type Activity, type Cost, type FlightLeg, type Guest } from "../data/trip";
import type { CalendarEvent } from "../lib/ics";
import { parseItineraryNotes } from "../lib/itinerary";
import { ThemeToggle } from "./ThemeToggle";
import { QuestView } from "./QuestView";

type Section = "home" | "itinerary" | "calendar" | "quest" | "guests";
type Navigate = (section: Section, itineraryIndex?: number, activityId?: string) => void;
type CalendarPayload = {
  configured: boolean;
  events: CalendarEvent[];
  message?: string;
  syncedAt?: string;
};

const navItems: { id: Section; label: string; short: string; icon: string }[] = [
  { id: "home", label: "Home", short: "Home", icon: "⌂" },
  { id: "itinerary", label: "Itinerary", short: "Plan", icon: "≡" },
  { id: "calendar", label: "Calendar", short: "Dates", icon: "□" },
  { id: "quest", label: "Quest", short: "Quest", icon: "✦" },
  { id: "guests", label: "Guests", short: "Crew", icon: "●" },
];

const mobileNavItems = navItems.filter((item) => item.id !== "guests");

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
    </span>
  );
}

function costLabel(cost: Cost) {
  if (cost.kind === "free") return "Free";
  if (cost.kind === "per-person") return cost.amount ? `$${cost.amount} / person` : "Per person · TBD";
  if (cost.kind === "group") return cost.amount ? `$${cost.amount} group` : "Group cost · TBD";
  if (cost.kind === "custom") return cost.label;
  return "Cost TBD";
}

function appleMapsUrl(location: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
}

function googleMapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function telephoneUrl(phone: string) {
  return `tel:${phone.replace(/[^\d+*#,;]/g, "")}`;
}

const flightAwareAirlines: Record<string, string> = {
  AA: "AAL",
  AS: "ASA",
  B6: "JBU",
  DL: "DAL",
  F9: "FFT",
  NK: "NKS",
  UA: "UAL",
  WN: "SWA",
};

function flightTrackingUrl(flight: string) {
  const normalized = flight.toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);
  if (!match) return `https://www.flightaware.com/live/`;
  const [, airline, number] = match;
  return `https://www.flightaware.com/live/flight/${flightAwareAirlines[airline] ?? airline}${number}`;
}

function FlightTrackingLinks({ flights, className = "" }: { flights?: string[]; className?: string }) {
  if (!flights?.length) return null;
  return (
    <div className={`flight-tracking-links ${className}`.trim()}>
      {flights.map((flight) => (
        <a href={flightTrackingUrl(flight)} key={flight} target="_blank" rel="noreferrer">Track {flight} <span>↗</span></a>
      ))}
    </div>
  );
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function MapLink({ location, className, children }: { location: string; className: string; children: ReactNode }) {
  const [choosingMap, setChoosingMap] = useState(false);

  useEffect(() => {
    if (!choosingMap) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChoosingMap(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [choosingMap]);

  return (
    <>
      <a
        className={className}
        href={googleMapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        onClick={(click) => {
          if (isIOSDevice()) {
            click.preventDefault();
            setChoosingMap(true);
          }
        }}
      >{children}</a>
      {choosingMap && (
        <div className="map-choice-backdrop">
          <button className="map-choice-dismiss" type="button" aria-label="Close map choices" onClick={() => setChoosingMap(false)} />
          <div className="map-choice" role="dialog" aria-modal="true" aria-label={`Open ${location} in maps`}>
            <small>OPEN LOCATION</small>
            <h3>Choose your map</h3>
            <p>{location}</p>
            <div>
              <a href={appleMapsUrl(location)} target="_blank" rel="noreferrer" onClick={() => setChoosingMap(false)}>Apple Maps <span>↗</span></a>
              <a href={googleMapsUrl(location)} target="_blank" rel="noreferrer" onClick={() => setChoosingMap(false)}>Google Maps <span>↗</span></a>
              <button type="button" onClick={() => setChoosingMap(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActivityCard({ activity, selected = false }: { activity: Activity; selected?: boolean }) {
  return (
    <div className={`activity-card ${selected ? "selected-activity" : ""}`} id={`activity-${activity.id}`}>
      <div className="activity-time"><span>{activity.startTime ?? "TBD"}</span><small>{activity.duration ?? "Duration TBD"}</small></div>
      <div className="activity-copy">
        <h3>{activity.title}</h3>
        {activity.notes && <small>{activity.notes}</small>}
      </div>
      <div className="activity-actions">
        {activity.website && <a href={activity.website} target="_blank" rel="noreferrer">Visit website <span>↗</span></a>}
        {activity.phone && <a href={telephoneUrl(activity.phone)}>Call {activity.phone} <span>↗</span></a>}
        <FlightTrackingLinks flights={activity.flights} />
      </div>
      {activity.location
        ? <MapLink location={activity.location} className="activity-location">⌖ {activity.location} <span>↗</span></MapLink>
        : <span className="activity-location activity-location-empty">Location TBD</span>}
      {activity.cost.kind !== "tbd" && <div className={`cost-chip ${activity.cost.kind}`}>{costLabel(activity.cost)}</div>}
    </div>
  );
}

function formatEventDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { weekday: "Date", day: "—", full: value };
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
    full: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date),
  };
}

function formatEventTime(value: string, allDay: boolean) {
  if (allDay || !value.includes("T")) return "All day";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatEventDuration(event: CalendarEvent) {
  if (event.allDay) return "All day";
  if (!event.end) return "End time TBD";
  const start = new Date(event.start);
  const end = new Date(event.end);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return "End time TBD";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""].filter(Boolean).join(" ");
}

function eventToActivity(event: CalendarEvent): Activity {
  const details = parseItineraryNotes(event.description);
  return {
    id: event.id,
    title: event.title,
    startTime: formatEventTime(event.start, event.allDay),
    duration: formatEventDuration(event),
    location: event.location,
    website: event.url && /^https?:\/\//i.test(event.url) ? event.url : undefined,
    phone: details.phone,
    flights: details.flights,
    cost: details.cost,
    notes: details.notes,
  };
}

function formatTripDate(value?: string) {
  if (!value) return "Date TBD";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function californiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function suggestedItineraryIndex(today = californiaDateString()) {
  const currentIndex = itinerary.findIndex((day) => day.date === today);
  if (currentIndex >= 0) return currentIndex;
  const nextIndex = itinerary.findIndex((day) => day.date > today);
  return nextIndex >= 0 ? nextIndex : itinerary.length - 1;
}

function useCaliforniaDate() {
  const [today, setToday] = useState("");

  useEffect(() => {
    const update = () => setToday(californiaDateString());
    queueMicrotask(update);
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return today;
}

function useCurrentTime() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    queueMicrotask(update);
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function daysBetween(start: string, end: string) {
  const asUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.ceil((asUtc(end) - asUtc(start)) / 86_400_000);
}

function TripDateCards() {
  const today = useCaliforniaDate();
  const currentDay = itinerary.find((day) => day.date === today);

  let countdownLabel = "COUNTDOWN";
  let countdownValue = "—";
  let countdownNote = "Until assemble day";
  if (today && today < trip.dates.start) countdownValue = `${daysBetween(today, trip.dates.start)} days`;
  if (today === trip.dates.start && !currentDay) {
    countdownLabel = "TRIP DAY";
    countdownValue = "Arrival day";
    countdownNote = "The adventure begins";
  }
  if (currentDay) {
    countdownLabel = "TRIP DAY";
    countdownValue = currentDay.day === 0 ? "Arrival day" : `Day ${currentDay.day} of ${Math.max(...itinerary.map((day) => day.day))}`;
    countdownNote = `${currentDay.destination} · today`;
  }
  if (today && today > trip.dates.end) {
    countdownLabel = "STATUS";
    countdownValue = "Trip complete";
    countdownNote = "Week well spent";
  }

  return (
    <div className="hero-countdown">
      <small>{countdownLabel}</small>
      <strong>{countdownValue}</strong>
      <p>{countdownNote}</p>
    </div>
  );
}

function NextPlannedCard({ calendar }: { calendar: CalendarPayload | null }) {
  const today = useCaliforniaDate();
  const now = useCurrentTime();
  const currentDay = itinerary.find((day) => day.date === today);
  const nextDay = itinerary.find((day) => !today || day.date > today);
  const fallbackDay = currentDay ?? nextDay ?? itinerary[itinerary.length - 1];
  const itineraryDates = useMemo(() => new Set(itinerary.map((day) => day.date)), []);
  const nextEvent = useMemo(() => {
    if (!calendar?.events.length || now === null || !today) return undefined;
    return calendar.events.find((event) => {
      const eventDate = event.start.slice(0, 10);
      if (!itineraryDates.has(eventDate)) return false;
      if (event.allDay) return eventDate >= today;
      const start = new Date(event.start).getTime();
      return Number.isFinite(start) ? start >= now : eventDate >= today;
    });
  }, [calendar, itineraryDates, now, today]);
  const liveDay = nextEvent ? itinerary.find((day) => day.date === nextEvent.start.slice(0, 10)) : undefined;
  const featuredDay = liveDay ?? fallbackDay;
  const activity = nextEvent ? eventToActivity(nextEvent) : featuredDay.activities[0];
  const label = nextEvent
    ? nextEvent.start.slice(0, 10) === today ? "TODAY" : "NEXT PLANNED"
    : currentDay ? "TODAY" : nextDay ? "NEXT PLANNED" : "TRIP COMPLETE";

  return (
    <div className="next-card panel-paper">
      <div className="card-kicker"><span className="pulse" /><span>{label}</span><b>{featuredDay.destination}</b></div>
      <div className="big-number">{String(featuredDay.day).padStart(2, "0")}</div>
      <h3>{activity.title}</h3>
      <p>{formatTripDate(featuredDay.date)}</p>
      <hr />
      <dl><div><dt>DEPARTS</dt><dd>{activity.startTime ?? "TBD"}</dd></div><div><dt>DURATION</dt><dd>{activity.duration ?? "TBD"}</dd></div></dl>
      <FlightTrackingLinks flights={activity.flights} className="next-flight-links" />
      {activity.location
        ? <MapLink location={activity.location} className="next-location">⌖ {activity.location} <span>↗</span></MapLink>
        : null}
    </div>
  );
}

function AppHeader({ section, onNavigate }: { section: Section; onNavigate: Navigate }) {
  return (
    <>
      <header className="site-header">
        <button className="brand brand-button" onClick={() => onNavigate("home")} aria-label={`${trip.workingName} home`}>
          <Logo />
          <span><b>{trip.workingName.toUpperCase()}</b><small>{trip.tagline}</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <button className="avatar-stack" onClick={() => onNavigate("guests")} aria-label="View travelers">
            {guests.map((guest) => <span key={guest.id}>{guest.initials}</span>)}
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
            <span>{item.icon}</span>{item.short}
          </button>
        ))}
      </nav>
    </>
  );
}

function HomeView({ onNavigate, calendar }: { onNavigate: Navigate; calendar: CalendarPayload | null }) {
  const weekStops = ["Big Sur", "Santa Cruz", "Lake Tahoe", "San Francisco", "Sunnyvale"];

  return (
    <>
      <section className="hero page-enter">
        <div className="hero-copy">
          <p className="eyebrow">OCT 23 — NOV 01 · CALIFORNIA ’26</p>
          <TripDateCards />
          <h1>City lights.<br/><em>Wild nights.</em></h1>
        </div>

        <div className="route-card" aria-label="Trip route concept">
          <div className="route-map">
            <div className="sun" />
            <div className="mountains"><i/><i/><i/></div>
            <div className="water-lines"><i/><i/><i/></div>
            {weekStops.map((stop, index) => (
              <div className={`route-stop stop-${index + 1}`} key={stop}><span>{index + 1}</span><b>{stop}</b></div>
            ))}
          </div>
          <div className="route-card-bottom"><span>↓ PACIFIC COAST</span><span>OCT 23 — NOV 01</span></div>
        </div>
      </section>

      <section className="home-grid section-shell">
        <div className="week-peek panel-dark">
          <div className="panel-heading"><div><p className="eyebrow light">THE ADVENTURE</p><h2>Nine days.<br/><em>Zero ordinary.</em></h2></div><button onClick={() => onNavigate("itinerary")}>Full plan →</button></div>
          <div className="mini-days">
            {itinerary.map((day, index) => (
              <button key={day.day} onClick={() => onNavigate("itinerary", index)}>
                <small>DAY</small><strong>{String(day.day).padStart(2, "0")}</strong><span>{day.destination}</span>
              </button>
            ))}
          </div>
        </div>

        <NextPlannedCard calendar={calendar} />

        <div className="photos-card panel-paper">
          <div>
            <p className="eyebrow">PHOTOS</p>
            <h3>Trip photo album</h3>
            <p>Open the shared album to view photos or add your own.</p>
          </div>
          {trip.photos.albumUrl ? (
            <a href={trip.photos.albumUrl} target="_blank" rel="noreferrer">Open shared album <span>↗</span></a>
          ) : (
            <span className="album-pending">Album link pending</span>
          )}
        </div>

        <div className="calendar-peek panel-lake">
          <div><h3>Current plans,<br/>updated from iCloud.</h3></div>
          <button onClick={() => onNavigate("calendar")}>Open calendar <span>→</span></button>
        </div>
      </section>
    </>
  );
}

function ItineraryView({ calendar, selectedIndex, selectedActivityId, onSelect }: { calendar: CalendarPayload | null; selectedIndex: number; selectedActivityId: string | null; onSelect: (index: number) => void }) {
  const today = useCaliforniaDate();
  const menuStartIndex = today ? suggestedItineraryIndex(today) : 0;
  const orderedDays = itinerary.map((_, offset) => {
    const originalIndex = (menuStartIndex + offset) % itinerary.length;
    return { day: itinerary[originalIndex], originalIndex };
  });
  const selectedDay = itinerary[selectedIndex];
  const liveActivities = useMemo(
    () => (calendar?.events ?? [])
      .filter((event) => event.start.slice(0, 10) === selectedDay.date)
      .map(eventToActivity),
    [calendar, selectedDay.date],
  );
  const activities = liveActivities.length ? liveActivities : selectedDay.activities;
  const isLive = liveActivities.length > 0;

  useEffect(() => {
    if (!selectedActivityId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`activity-${selectedActivityId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedActivityId, selectedDay.date, activities.length]);

  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell">
        <div><p className="eyebrow">DAY BY DAY</p><h1>The week,<br/><em>mapped out.</em></h1></div>
        <div className="page-note"><span className="confirmed-tag"><i /> {calendar === null ? "Syncing iCloud" : calendar.configured ? "Calendar connected" : "Calendar unavailable"}</span><p>Select a day to view its schedule, notes, location, contact details, and cost.</p></div>
      </header>
      <section className="itinerary-stage section-shell">
        <div className="itinerary-piano" aria-label="Choose an itinerary day">
          {orderedDays.map(({ day, originalIndex }) => (
            <button
              className={`piano-key tone-${day.tone} ${selectedIndex === originalIndex ? "active" : ""}`}
              key={day.day}
              type="button"
              aria-pressed={selectedIndex === originalIndex}
              aria-controls={`itinerary-day-${day.day}`}
              onClick={() => onSelect(originalIndex)}
            >
              <small>DAY</small>
              <strong>{String(day.day).padStart(2, "0")}</strong>
              <time dateTime={day.date}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${day.date}T12:00:00`))}</time>
              <span>{day.destination}</span>
            </button>
          ))}
        </div>

        <article className={`day-block selected-day tone-${selectedDay.tone}`} id={`itinerary-day-${selectedDay.day}`} key={selectedDay.day}>
          <header>
            <div className="day-number"><small>DAY</small><strong>{String(selectedDay.day).padStart(2, "0")}</strong></div>
            <div className="day-destination"><small>{formatTripDate(selectedDay.date)}</small><h2>{selectedDay.destination}</h2></div>
            <span className="day-status">{isLive ? `${liveActivities.length} LIVE ${liveActivities.length === 1 ? "ACTIVITY" : "ACTIVITIES"}` : calendar === null ? "SYNCING" : "PLAN OPEN"}</span>
          </header>
          <div className="activity-list">
            {activities.map((activity) => <ActivityCard activity={activity} selected={activity.id === selectedActivityId} key={activity.id} />)}
          </div>
        </article>
      </section>
    </div>
  );
}

function CalendarView({ calendar, onNavigate }: { calendar: CalendarPayload | null; onNavigate: Navigate }) {
  const eventsByDay = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of calendar?.events ?? []) {
      const key = event.start.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()];
  }, [calendar]);

  const loading = calendar === null;
  const connected = calendar?.configured && calendar.events.length > 0;

  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell calendar-title">
        <div><p className="eyebrow">TRIP CALENDAR</p><h1>Shared plans,<br/><em>in one place.</em></h1></div>
        <div className={`sync-status ${connected ? "connected" : ""}`}><span />{loading ? "Checking calendar…" : connected ? "iCloud calendar connected" : "Ready to connect"}</div>
      </header>

      <section className="calendar-layout section-shell">
        <div className="agenda-panel panel-paper">
          <div className="agenda-toolbar"><div><small>AGENDA</small><h2>{connected ? "Trip events" : "Your trip week"}</h2></div><span>{calendar?.events.length ?? 0} EVENTS</span></div>
          {connected ? (
            <div className="event-days">
              {eventsByDay.map(([date, events]) => {
                const label = formatEventDate(date);
                return (
                  <div className="event-day" key={date}>
                    <div className="event-date"><small>{label.weekday}</small><strong>{label.day}</strong></div>
                    <div className="event-stack">
                      <h3>{label.full}</h3>
                      {events.map((event) => {
                        const itineraryIndex = itinerary.findIndex((day) => day.date === event.start.slice(0, 10));
                        return (
                          <button
                            aria-label={`View ${event.title} details in Plan`}
                            className="calendar-event"
                            disabled={itineraryIndex < 0}
                            key={event.id}
                            type="button"
                            onClick={() => onNavigate("itinerary", itineraryIndex, event.id)}
                          >
                            <span className="event-time">{formatEventTime(event.start, event.allDay)}{event.end && !event.allDay ? <small>— {formatEventTime(event.end, false)}</small> : null}</span>
                            <div className="calendar-event-copy"><h4>{event.title}</h4></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-agenda">
              <div className="empty-calendar-mark"><span>CAL</span><strong>—</strong></div>
              <h3>Calendar events will appear here</h3>
              <p>Connect the shared iCloud calendar to display event dates, times, and titles.</p>
              <div className="agenda-skeleton"><i/><i/><i/></div>
            </div>
          )}
        </div>

        <aside className="calendar-connect panel-dark">
          {connected ? (
            <>
              <p className="eyebrow light">LIVE FROM ICLOUD</p>
              <h2>Connected.<br/><em>Up to date.</em></h2>
              <p>Showing {calendar.events.length} events from the shared trip calendar.</p>
              <div className="calendar-live-count"><strong>{calendar.events.length}</strong><span>LIVE<br/>EVENTS</span></div>
              <ol>
                <li><span>01</span><div><b>Edit in Apple Calendar</b><small>Use the existing shared trip calendar.</small></div></li>
                <li><span>02</span><div><b>Refresh to update</b><small>Each page load requests the latest calendar.</small></div></li>
                <li><span>03</span><div><b>Agenda stays protected</b><small>The calendar endpoint requires the Campfire Code cookie.</small></div></li>
              </ol>
              <div className="privacy-note"><b>Last checked</b><p>{calendar.syncedAt ? formatEventDate(calendar.syncedAt).full : "During this page visit"}</p></div>
            </>
          ) : (
            <>
              <p className="eyebrow light">CALENDAR STATUS</p>
              <h2>Not connected.</h2>
              <p>Add the public iCloud calendar setting to display shared events.</p>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}

function Value({ children }: { children?: string }) {
  return <span className={!children ? "tbd-value" : ""}>{children || "TBD"}</span>;
}

function FlightInfo({ leg, kind, guest }: { leg: FlightLeg; kind: "arrival" | "departure"; guest: Guest }) {
  const hasTravel = Boolean(leg.origin || leg.destination || leg.airline || leg.flightNumber);
  const noFlightNeeded = guest.status === "Host" || guest.status === "Local";

  return (
    <div className={`flight-leg ${kind}`}>
      <div className="leg-title">
        <span>{kind === "arrival" ? "↓" : "↑"}</span>
        <div><small>{kind.toUpperCase()}</small><b><Value>{leg.date ? formatTripDate(leg.date) : noFlightNeeded ? `${guest.status} · local` : undefined}</Value></b></div>
      </div>
      {hasTravel ? (
        <>
          <div className="airport-row">
            <div><strong><Value>{leg.origin}</Value></strong><small>{leg.departTime ?? "Time TBD"}</small></div>
            <i />
            <div className="airport-destination"><strong><Value>{leg.destination}</Value></strong><small>{leg.arriveTime ?? "Time TBD"}</small></div>
          </div>
          <div className="flight-meta">
            <span>AIRLINE <b><Value>{leg.airline}</Value></b></span>
            <span>FLIGHT <b><Value>{leg.flightNumber}</Value></b></span>
            <span>DURATION <b><Value>{leg.duration}</Value></b></span>
            <span>ROUTE <b><Value>{leg.stops}</Value></b></span>
          </div>
        </>
      ) : (
        <div className="no-flight"><b>{noFlightNeeded ? "No flight needed" : "Details awaiting"}</b><p>{noFlightNeeded ? "Already in the Bay Area." : "Add flight details once confirmed."}</p></div>
      )}
    </div>
  );
}

function GuestsView() {
  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell">
        <div><p className="eyebrow">THE CREW</p><h1>Arrivals,<br/><em>all together.</em></h1></div>
        <div className="page-note"><span className="confirmed-tag"><i /> 7 travelers</span><p>Arrival, departure, and home-base information for the group.</p></div>
      </header>
      <section className="guest-grid section-shell">
        {guests.map((guest, index) => (
          <article className="guest-card panel-paper" key={guest.id}>
            <header><div className={`guest-avatar avatar-${index + 1}`}>{guest.initials}</div><div><h2>{guest.name}</h2><span className={`guest-status status-${guest.status.toLowerCase().replaceAll(" ", "-")}`}>{guest.status}</span><p>{guest.homeBase}</p></div></header>
            <FlightInfo leg={guest.arrival} kind="arrival" guest={guest} />
            <FlightInfo leg={guest.departure} kind="departure" guest={guest} />
            {guest.notes && <p className="guest-note">{guest.notes}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}

export function TripDashboard() {
  const [section, setSection] = useState<Section>("home");
  const [calendar, setCalendar] = useState<CalendarPayload | null>(null);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState(0);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as Section;
    if (navItems.some((item) => item.id === hash)) {
      queueMicrotask(() => {
        setSection(hash);
        if (hash === "itinerary") setSelectedItineraryIndex(suggestedItineraryIndex());
      });
    }
    fetch(trip.calendar.apiPath, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setCalendar(payload as CalendarPayload))
      .catch(() => setCalendar({ configured: false, events: [], message: "Calendar unavailable." }));
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker.register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (!cancelled) registration.active?.postMessage({ type: "CACHE_APP" });
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  const navigate: Navigate = (next, itineraryIndex, activityId) => {
    if (next === "itinerary") {
      setSelectedItineraryIndex(itineraryIndex ?? suggestedItineraryIndex());
      setSelectedActivityId(activityId ?? null);
    } else {
      setSelectedActivityId(null);
    }
    setSection(next);
    window.history.replaceState(null, "", next === "home" ? window.location.pathname : `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main data-fog-fire-dashboard="true">
      <AppHeader section={section} onNavigate={navigate} />
      {section === "home" && <HomeView onNavigate={navigate} calendar={calendar} />}
      {section === "itinerary" && <ItineraryView calendar={calendar} selectedIndex={selectedItineraryIndex} selectedActivityId={selectedActivityId} onSelect={(index) => { setSelectedItineraryIndex(index); setSelectedActivityId(null); }} />}
      {section === "calendar" && <CalendarView calendar={calendar} onNavigate={navigate} />}
      {section === "quest" && <QuestView />}
      {section === "guests" && <GuestsView />}
      <footer className="site-footer">
        <div><Logo/><span><b>{trip.workingName}</b><small>California · ’26</small></span></div>
        <div className="footer-actions">
          <p>Made for good friends and better stories.</p>
          <a
            href="/install"
            aria-label="Learn how to install this app on iPhone or Android"
          >
            Install this app <span aria-hidden="true">→</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
