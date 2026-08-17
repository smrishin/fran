"use client";

import { useEffect, useMemo, useState } from "react";
import { guests, itinerary, trip, type Activity, type Cost } from "../data/trip";
import type { CalendarEvent } from "../lib/ics";

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

function PlaceholderTag({ children = "Planning placeholder" }: { children?: React.ReactNode }) {
  return <span className="placeholder-tag"><i />{children}</span>;
}

function costLabel(cost: Cost) {
  if (cost.kind === "free") return "Free";
  if (cost.kind === "per-person") return cost.amount ? `$${cost.amount} / person` : "Per person · TBD";
  if (cost.kind === "group") return cost.amount ? `$${cost.amount} group` : "Group cost · TBD";
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
        <button className="avatar-stack" onClick={() => onNavigate("guests")} aria-label="View travelers">
          <span>01</span><span>02</span><b>The crew</b>
        </button>
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
  const weekStops = ["San Francisco", "Lake Tahoe", "Santa Cruz", "Sunnyvale"];

  return (
    <>
      <section className="hero page-enter">
        <div className="hero-copy">
          <p className="eyebrow">THE GOLDEN STATE · 7 DAYS</p>
          <h1>City lights.<br/><em>Wild nights.</em></h1>
          <p className="intro">One week from the Bay to the lake, down the coast, and everywhere worth remembering in between.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("itinerary")}>Explore the week <span>→</span></button>
            <PlaceholderTag>Dates coming soon</PlaceholderTag>
          </div>
        </div>

        <div className="route-card" aria-label="Trip route concept">
          <div className="route-card-top"><span>THE ROUTE</span><b>01 — 07</b></div>
          <div className="route-map">
            <div className="sun" />
            <div className="mountains"><i/><i/><i/></div>
            <div className="water-lines"><i/><i/><i/></div>
            {weekStops.map((stop, index) => (
              <div className={`route-stop stop-${index + 1}`} key={stop}><span>{index + 1}</span><b>{stop}</b></div>
            ))}
          </div>
          <div className="route-card-bottom"><span>↓ PACIFIC COAST</span><span>OCTOBER · CALIFORNIA</span></div>
        </div>
      </section>

      <section className="quick-strip" aria-label="Trip overview">
        <div><small>COUNTDOWN</small><strong>—</strong><p>Add trip dates to start</p></div>
        <div><small>FIRST STOP</small><strong>San Francisco</strong><p>Arrival plan · Details pending</p></div>
        <div><small>TRIP LENGTH</small><strong>7 days</strong><p>Four California stops</p></div>
        <div><small>THE CREW</small><strong>Friends</strong><p>Guest list coming soon</p></div>
      </section>

      <section className="home-grid section-shell">
        <div className="week-peek panel-dark">
          <div className="panel-heading"><div><p className="eyebrow light">THE WEEK</p><h2>Seven days.<br/><em>Zero ordinary.</em></h2></div><button onClick={() => onNavigate("itinerary")}>Full plan →</button></div>
          <div className="mini-days">
            {itinerary.map((day) => (
              <button key={day.day} onClick={() => onNavigate("itinerary")}>
                <small>DAY</small><strong>{String(day.day).padStart(2, "0")}</strong><span>{day.destination}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="next-card panel-paper">
          <div className="card-kicker"><span className="pulse" /> NEXT PLANNED</div>
          <div className="big-number">01</div>
          <h3>Arrival day</h3>
          <p>San Francisco</p>
          <hr />
          <dl><div><dt>TIME</dt><dd>TBD</dd></div><div><dt>PLAN</dt><dd>Airport pickups</dd></div></dl>
          <PlaceholderTag />
        </div>

        <div className="trip-shape panel-paper">
          <div className="card-kicker">TRIP SHAPE</div>
          <h3>Bay → Lake → Coast</h3>
          <p>The current structure uses only the places and themes in your brief. Nothing here is confirmed yet.</p>
          <div className="theme-tags"><span>Boating</span><span>Camping</span><span>Alcatraz</span><span>Halloween</span></div>
        </div>

        <div className="calendar-peek panel-lake">
          <div><p className="eyebrow light">LIVE CALENDAR</p><h3>Your iCloud events,<br/>right where the plan lives.</h3></div>
          <button onClick={() => onNavigate("calendar")}>Connect calendar <span>→</span></button>
        </div>
      </section>
    </>
  );
}

function ItineraryView() {
  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell">
        <div><p className="eyebrow">DAY BY DAY</p><h1>The week,<br/><em>mapped out.</em></h1></div>
        <div className="page-note"><PlaceholderTag /><p>All details below are editable planning placeholders based only on the supplied trip themes.</p></div>
      </header>
      <section className="itinerary-list section-shell">
        {itinerary.map((day) => (
          <article className={`day-block tone-${day.tone}`} key={day.day}>
            <header>
              <div className="day-number"><small>DAY</small><strong>{String(day.day).padStart(2, "0")}</strong></div>
              <div className="day-destination"><small>{day.date ?? "DATE TBD"}</small><h2>{day.destination}</h2></div>
              <span className="day-status">DRAFT</span>
            </header>
            <div className="activity-list">
              {day.activities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
            </div>
          </article>
        ))}
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
                          <div><h4>{event.title}</h4>{event.location && <p>⌖ {event.location}</p>}{event.description && <p>{event.description}</p>}</div>
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
              <p>No events are hardcoded. Once the public calendar link is added, date, time, title, location, and notes will flow into this agenda automatically.</p>
              <div className="agenda-skeleton"><i/><i/><i/></div>
            </div>
          )}
        </div>

        <aside className="calendar-connect panel-dark">
          <p className="eyebrow light">SIMPLEST SETUP</p>
          <h2>Share once.<br/><em>Stay in sync.</em></h2>
          <p>Apple’s public calendar link is read-only and lets this dashboard refresh events without asking every friend to sign in.</p>
          <ol>
            <li><span>01</span><div><b>Open iCloud Calendar</b><small>Select the dedicated trip calendar.</small></div></li>
            <li><span>02</span><div><b>Turn on Public Calendar</b><small>Copy the generated sharing link.</small></div></li>
            <li><span>03</span><div><b>Add the link securely</b><small>Use the calendar environment setting before launch.</small></div></li>
          </ol>
          <div className="privacy-note"><b>Good to know</b><p>Anyone with a public iCloud link can read that calendar. Use a trip-only calendar and avoid sensitive details.</p></div>
        </aside>
      </section>
    </div>
  );
}

function Value({ children }: { children?: string }) {
  return <span className={!children ? "tbd-value" : ""}>{children || "TBD"}</span>;
}

function GuestsView() {
  return (
    <div className="inner-page page-enter">
      <header className="page-title-row section-shell">
        <div><p className="eyebrow">THE CREW</p><h1>Arrivals,<br/><em>all together.</em></h1></div>
        <div className="page-note"><PlaceholderTag /><p>Traveler and flight cards are wired to one editable data file. No guest details have been invented.</p></div>
      </header>
      <section className="guest-grid section-shell">
        {guests.map((guest, index) => (
          <article className="guest-card panel-paper" key={guest.id}>
            <header><div className={`guest-avatar avatar-${index + 1}`}>{guest.initials}</div><div><h2>{guest.name}</h2><PlaceholderTag>Guest placeholder</PlaceholderTag></div></header>
            <div className="flight-leg">
              <div className="leg-title"><span>↓</span><div><small>ARRIVAL</small><b><Value>{guest.arrival.date}</Value></b></div></div>
              <div className="airport-row"><strong><Value>{guest.arrival.location}</Value></strong><i/><strong>{guest.arrival.time || "—:—"}</strong></div>
              <div className="flight-meta"><span>AIRLINE <b><Value>{guest.arrival.airline}</Value></b></span><span>FLIGHT <b><Value>{guest.arrival.flightNumber}</Value></b></span></div>
            </div>
            <div className="flight-leg departure">
              <div className="leg-title"><span>↑</span><div><small>DEPARTURE</small><b><Value>{guest.departure.date}</Value></b></div></div>
              <div className="airport-row"><strong><Value>{guest.departure.location}</Value></strong><i/><strong>{guest.departure.time || "—:—"}</strong></div>
              <div className="flight-meta"><span>AIRLINE <b><Value>{guest.departure.airline}</Value></b></span><span>FLIGHT <b><Value>{guest.departure.flightNumber}</Value></b></span></div>
            </div>
            {guest.notes && <p className="guest-note">{guest.notes}</p>}
          </article>
        ))}
        <div className="add-guest-card"><span>+</span><h3>Room for the whole crew</h3><p>Add the confirmed travelers when you’re ready.</p></div>
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
    fetch(trip.calendar.apiPath)
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
      {section === "itinerary" && <ItineraryView />}
      {section === "calendar" && <CalendarView calendar={calendar} />}
      {section === "guests" && <GuestsView />}
      <footer className="site-footer"><div><Logo/><span><b>{trip.workingName}</b><small>Working name · Design direction 01</small></span></div><p>Made for good friends and better stories.</p></footer>
    </main>
  );
}
