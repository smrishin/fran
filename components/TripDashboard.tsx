"use client";

import { useEffect, useMemo, useState } from "react";
import { guests, itinerary, trip, type Activity, type Cost, type FlightLeg, type Guest } from "../data/trip";
import type { CalendarEvent } from "../lib/ics";
import { parseItineraryNotes } from "../lib/itinerary";
import { ThemeToggle } from "./ThemeToggle";

type Section = "home" | "itinerary" | "calendar" | "guests";
type CalendarPayload = {
  configured: boolean;
  events: CalendarEvent[];
  message?: string;
  syncedAt?: string;
};

const navItems: { id: Section; label: string; short: string }[] = [
  { id: "home", label: "Home", short: "Home" },
  { id: "itinerary", label: "Itinerary", short: "Plan" },
  { id: "calendar", label: "Calendar", short: "Dates" },
  { id: "guests", label: "Guests", short: "Crew" },
];

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

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="activity-card">
      <div className="activity-time"><span>{activity.startTime ?? "TBD"}</span><small>{activity.duration ?? "Duration TBD"}</small></div>
      <div className="activity-copy">
        <h3>{activity.title}</h3>
        <p>{activity.location ?? "Location TBD"}</p>
        {activity.notes && <small>{activity.notes}</small>}
        {activity.website && <a href={activity.website} target="_blank" rel="noreferrer">Visit website <span>↗</span></a>}
      </div>
      <div className={`cost-chip ${activity.cost.kind}`}>{costLabel(activity.cost)}</div>
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
    cost: details.cost,
    notes: details.notes,
  };
}

function formatTripDate(value?: string) {
  if (!value) return "Date TBD";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function useCaliforniaDate() {
  const [today, setToday] = useState("");

  useEffect(() => {
    const update = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      setToday(`${value.year}-${value.month}-${value.day}`);
    };
    queueMicrotask(update);
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return today;
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
  const firstDay = itinerary[0];
  const lastDay = itinerary[itinerary.length - 1];
  const currentDay = itinerary.find((day) => day.date === today);
  const nextDay = itinerary.find((day) => !today || day.date > today);

  let countdownLabel = "COUNTDOWN";
  let countdownValue = "—";
  let countdownNote = "Until assemble day";
  if (today && today < trip.dates.start) countdownValue = `${daysBetween(today, trip.dates.start)} days`;
  if (currentDay) {
    countdownLabel = "TRIP DAY";
    countdownValue = `Day ${currentDay.day} of ${itinerary.length}`;
    countdownNote = `${currentDay.destination} · today`;
  }
  if (today && today > trip.dates.end) {
    countdownLabel = "STATUS";
    countdownValue = "Trip complete";
    countdownNote = "Nine days, well spent";
  }

  const featuredDay = currentDay ?? nextDay ?? lastDay;
  const featuredLabel = currentDay ? "TODAY" : nextDay ? "NEXT DAY" : "LAST DAY";

  return (
    <>
      <div><small>{countdownLabel}</small><strong>{countdownValue}</strong><p>{countdownNote}</p></div>
      <div><small>{featuredLabel}</small><strong>{featuredDay?.destination ?? firstDay.destination}</strong><p>{formatTripDate(featuredDay?.date ?? firstDay.date)}</p></div>
    </>
  );
}

function NextPlannedCard() {
  const today = useCaliforniaDate();
  const currentDay = itinerary.find((day) => day.date === today);
  const nextDay = itinerary.find((day) => !today || day.date > today);
  const featuredDay = currentDay ?? nextDay ?? itinerary[itinerary.length - 1];
  const label = currentDay ? "TODAY" : nextDay ? "NEXT PLANNED" : "TRIP COMPLETE";
  const activity = featuredDay.activities[0];

  return (
    <div className="next-card panel-paper">
      <div className="card-kicker"><span className="pulse" /> {label}</div>
      <div className="big-number">{String(featuredDay.day).padStart(2, "0")}</div>
      <h3>{featuredDay.destination}</h3>
      <p>{formatTripDate(featuredDay.date)}</p>
      <hr />
      <dl><div><dt>TIME</dt><dd>{activity.startTime ?? "TBD"}</dd></div><div><dt>PLAN</dt><dd>{activity.title}</dd></div></dl>
      <span className="confirmed-tag"><i /> Date confirmed</span>
    </div>
  );
}

function AppHeader({ section, onNavigate }: { section: Section; onNavigate: (section: Section) => void }) {
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
            <span>{guests[0].initials}</span><span>{guests[1].initials}</span><b>7 travelers</b>
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item, index) => (
          <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
            <span>{index === 0 ? "⌂" : index === 1 ? "≡" : index === 2 ? "□" : "••"}</span>{item.short}
          </button>
        ))}
      </nav>
    </>
  );
}

function HomeView({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const weekStops = ["Big Sur", "Santa Cruz", "Lake Tahoe", "San Francisco", "Sunnyvale"];

  return (
    <>
      <section className="hero page-enter">
        <div className="hero-copy">
          <p className="eyebrow">OCT 24 — NOV 01 · CALIFORNIA ’26</p>
          <h1>City lights.<br/><em>Wild nights.</em></h1>
          <p className="intro">Nine days from Big Sur to Tahoe, through the Bay, and everywhere worth remembering in between.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("itinerary")}>Explore the week <span>→</span></button>
            <span className="confirmed-tag"><i /> Dates locked</span>
          </div>
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
          <div className="route-card-bottom"><span>↓ PACIFIC COAST</span><span>OCT 24 — NOV 01</span></div>
        </div>
      </section>

      <section className="quick-strip" aria-label="Trip overview">
        <TripDateCards />
        <div><small>TRIP LENGTH</small><strong>9 days</strong><p>October 24 — November 1</p></div>
        <div><small>THE CREW</small><strong>7 travelers</strong><p>Two hosts · Five guests</p></div>
      </section>

      <section className="home-grid section-shell">
        <div className="week-peek panel-dark">
          <div className="panel-heading"><div><p className="eyebrow light">THE ADVENTURE</p><h2>Nine days.<br/><em>Zero ordinary.</em></h2></div><button onClick={() => onNavigate("itinerary")}>Full plan →</button></div>
          <div className="mini-days">
            {itinerary.map((day) => (
              <button key={day.day} onClick={() => onNavigate("itinerary")}>
                <small>DAY</small><strong>{String(day.day).padStart(2, "0")}</strong><span>{day.destination}</span>
              </button>
            ))}
          </div>
        </div>

        <NextPlannedCard />

        <div className="trip-shape panel-paper">
          <div className="card-kicker">TRIP SHAPE</div>
          <h3>Coast → Lake → Bay</h3>
          <p>The main daily destinations are now confirmed. Times, activities, and costs can fill in as the shared calendar evolves.</p>
          <div className="theme-tags"><span>Boating</span><span>Camping</span><span>Alcatraz</span><span>Halloween</span></div>
        </div>

        <div className="calendar-peek panel-lake">
          <div><p className="eyebrow light">LIVE CALENDAR</p><h3>Your iCloud events,<br/>right where the plan lives.</h3></div>
          <button onClick={() => onNavigate("calendar")}>Open calendar <span>→</span></button>
        </div>
      </section>
    </>
  );
}

function ItineraryView({ calendar }: { calendar: CalendarPayload | null }) {
  const today = useCaliforniaDate();
  const initialDay = itinerary.findIndex((day) => day.date === today);
  const [selectedIndex, setSelectedIndex] = useState(initialDay >= 0 ? initialDay : 0);
  const selectedDay = itinerary[selectedIndex];
  const liveActivities = useMemo(
    () => (calendar?.events ?? [])
      .filter((event) => event.start.slice(0, 10) === selectedDay.date)
      .map(eventToActivity),
    [calendar, selectedDay.date],
  );
  const activities = liveActivities.length ? liveActivities : selectedDay.activities;
  const isLive = liveActivities.length > 0;

  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell">
        <div><p className="eyebrow">DAY BY DAY</p><h1>The week,<br/><em>mapped out.</em></h1></div>
        <div className="page-note"><span className="confirmed-tag"><i /> {calendar === null ? "Syncing iCloud" : calendar.configured ? "Live iCloud details" : "Calendar unavailable"}</span><p>Choose a day to see its activities. Times, notes, locations, websites, and costs flow from the shared calendar.</p></div>
      </header>
      <section className="itinerary-stage section-shell">
        <div className="itinerary-piano" aria-label="Choose an itinerary day">
          {itinerary.map((day, index) => (
            <button
              className={`piano-key tone-${day.tone} ${selectedIndex === index ? "active" : ""}`}
              key={day.day}
              type="button"
              aria-pressed={selectedIndex === index}
              aria-controls={`itinerary-day-${day.day}`}
              onClick={() => setSelectedIndex(index)}
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
            {activities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
          </div>
        </article>
      </section>
    </div>
  );
}

function CalendarView({ calendar }: { calendar: CalendarPayload | null }) {
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
        <div><p className="eyebrow">TRIP CALENDAR</p><h1>Every plan.<br/><em>One timeline.</em></h1></div>
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
                      {events.map((event) => (
                        <article className="calendar-event" key={event.id}>
                          <div className="event-time">{formatEventTime(event.start, event.allDay)}{event.end && !event.allDay ? <small>— {formatEventTime(event.end, false)}</small> : null}</div>
                          <div><h4>{event.title}</h4>{event.location && <p>⌖ {event.location}</p>}</div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-agenda">
              <div className="empty-calendar-mark"><span>CAL</span><strong>—</strong></div>
              <h3>Live events will appear here</h3>
              <p>No events are hardcoded. Once the public calendar link is added, date, time, title, and location will flow into this agenda automatically.</p>
              <div className="agenda-skeleton"><i/><i/><i/></div>
            </div>
          )}
        </div>

        <aside className="calendar-connect panel-dark">
          {connected ? (
            <>
              <p className="eyebrow light">LIVE FROM ICLOUD</p>
              <h2>Shared once.<br/><em>Kept in sync.</em></h2>
              <p>The trip calendar is connected and currently serving {calendar.events.length} events to the private agenda.</p>
              <div className="calendar-live-count"><strong>{calendar.events.length}</strong><span>LIVE<br/>EVENTS</span></div>
              <ol>
                <li><span>01</span><div><b>Edit in Apple Calendar</b><small>Use the existing shared trip calendar.</small></div></li>
                <li><span>02</span><div><b>Changes refresh on reload</b><small>Each full page load requests the latest iCloud feed.</small></div></li>
                <li><span>03</span><div><b>Agenda stays protected</b><small>The calendar endpoint requires the Campfire Code cookie.</small></div></li>
              </ol>
              <div className="privacy-note"><b>Last checked</b><p>{calendar.syncedAt ? formatEventDate(calendar.syncedAt).full : "During this page visit"}</p></div>
            </>
          ) : (
            <>
              <p className="eyebrow light">CALENDAR STATUS</p>
              <h2>Share once.<br/><em>Stay in sync.</em></h2>
              <p>The iCloud calendar is ready to appear here as soon as its server setting is available.</p>
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
        <div className="page-note"><span className="confirmed-tag"><i /> 7 travelers</span><p>Hosts, home bases, and all currently confirmed flights are collected here. Booking reference numbers are intentionally excluded.</p></div>
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

  useEffect(() => {
    const hash = window.location.hash.slice(1) as Section;
    if (navItems.some((item) => item.id === hash)) {
      queueMicrotask(() => setSection(hash));
    }
    fetch(trip.calendar.apiPath, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setCalendar(payload as CalendarPayload))
      .catch(() => setCalendar({ configured: false, events: [], message: "Calendar unavailable." }));
  }, []);

  const navigate = (next: Section) => {
    setSection(next);
    window.history.replaceState(null, "", next === "home" ? window.location.pathname : `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main>
      <AppHeader section={section} onNavigate={navigate} />
      {section === "home" && <HomeView onNavigate={navigate} />}
      {section === "itinerary" && <ItineraryView calendar={calendar} />}
      {section === "calendar" && <CalendarView calendar={calendar} />}
      {section === "guests" && <GuestsView />}
      <footer className="site-footer"><div><Logo/><span><b>{trip.workingName}</b><small>California · ’26</small></span></div><p>Made for good friends and better stories.</p></footer>
    </main>
  );
}
