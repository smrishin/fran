export type Cost =
  | { kind: "free" }
  | { kind: "per-person"; amount?: number }
  | { kind: "group"; amount?: number }
  | { kind: "custom"; label: string }
  | { kind: "tbd" };

export type Activity = {
  id: string;
  title: string;
  startTime?: string;
  duration?: string;
  location?: string;
  website?: string;
  phone?: string;
  flights?: string[];
  cost: Cost;
  notes?: string;
  placeholder?: boolean;
};

export type ItineraryDay = {
  day: number;
  date: string;
  destination: string;
  tone: "coral" | "lake" | "pine" | "sun";
  activities: Activity[];
  placeholder?: boolean;
};

export type FlightLeg = {
  date?: string;
  origin?: string;
  destination?: string;
  departTime?: string;
  arriveTime?: string;
  airline?: string;
  flightNumber?: string;
  duration?: string;
  stops?: string;
};

export type Guest = {
  id: string;
  name: string;
  initials: string;
  status: "Host" | "Local" | "Flight confirmed" | "Flight pending";
  homeBase: string;
  arrival: FlightLeg;
  departure: FlightLeg;
  notes?: string;
};

export const trip = {
  workingName: "Fog & Fire",
  tagline: "California · ’26 · One wild week",
  dates: { start: "2026-10-23", end: "2026-11-01" },
  locations: ["San Francisco", "Monterey", "Capitola", "Henry Cowell", "Santa Cruz", "Yosemite", "Sunnyvale"],
  heroStops: ["San Francisco", "Monterey", "Santa Cruz", "Yosemite", "Sunnyvale"],
  routeCaption: "Coast → Redwoods → Sierra",
  calendar: {
    source: "iCloud public calendar",
    apiPath: "/api/calendar",
  },
  photos: {
    albumUrl: "",
  },
};

const openPlan = (id: string, title: string, location: string): Activity => ({
  id,
  title,
  startTime: "TBD",
  duration: "TBD",
  location,
  cost: { kind: "tbd" },
  notes: "Add confirmed activities from the shared calendar.",
  placeholder: true,
});

export const itinerary: ItineraryDay[] = [
  {
    day: 0,
    date: "2026-10-23",
    destination: "Touchdown",
    tone: "lake",
    activities: [
      {
        id: "d0-a1",
        title: "Airport arrivals & first pickups",
        startTime: "8:30 PM",
        duration: "Pickup window: 8:30–9:30 PM",
        location: "San Francisco International Airport (SFO)",
        flights: ["WN3074", "WN3679"],
        cost: { kind: "tbd" },
        notes: "Sourav’s flights: WN 3074 · WN 3679. Calendar pickup window: 8:30–9:30 PM at SFO; this is not the flight arrival time.",
      },
    ],
  },
  { day: 1, date: "2026-10-24", destination: "Assemble", tone: "coral", activities: [openPlan("d1-a1", "The crew assembles", "San Francisco area · TBD")] },
  { day: 2, date: "2026-10-25", destination: "Monterey", tone: "sun", activities: [openPlan("d2-a1", "Monterey coast, Capitola & camp", "Monterey · Capitola · Henry Cowell Redwoods State Park")] },
  { day: 3, date: "2026-10-26", destination: "Redwoods + Santa Cruz", tone: "coral", activities: [openPlan("d3-a1", "Redwoods, Santa Cruz & the road to Yosemite", "Henry Cowell Redwoods State Park · Santa Cruz · Yosemite National Park")] },
  { day: 4, date: "2026-10-27", destination: "Yosemite", tone: "lake", activities: [openPlan("d4-a1", "A full day in Yosemite", "Yosemite National Park")] },
  { day: 5, date: "2026-10-28", destination: "Yosemite", tone: "pine", activities: [openPlan("d5-a1", "Yosemite morning & drive to Sunnyvale", "Yosemite National Park · Sunnyvale")] },
  { day: 6, date: "2026-10-29", destination: "San Francisco", tone: "coral", activities: [openPlan("d6-a1", "San Francisco day", "San Francisco")] },
  { day: 7, date: "2026-10-30", destination: "Sunnyvale", tone: "lake", activities: [openPlan("d7-a1", "Sunnyvale day", "Sunnyvale")] },
  { day: 8, date: "2026-10-31", destination: "Halloween", tone: "pine", activities: [openPlan("d8-a1", "Halloween", "Location TBD")] },
  { day: 9, date: "2026-11-01", destination: "Disassemble", tone: "sun", activities: [openPlan("d9-a1", "The crew disassembles", "San Francisco area · TBD")] },
];

export const guests: Guest[] = [
  {
    id: "sourav",
    name: "Sourav",
    initials: "SO",
    status: "Flight confirmed",
    homeBase: "Tampa, Florida",
    arrival: {
      date: "2026-10-23",
      origin: "TPA",
      destination: "SFO",
      airline: "Southwest Airlines",
      flightNumber: "WN 3074 · WN 3679",
      departTime: "4:50 PM EDT",
      arriveTime: "9:05 PM PDT",
      duration: "7h 15m",
      stops: "1 stop · SAN",
    },
    departure: {
      date: "2026-11-03",
      origin: "SFO",
      destination: "TPA",
      airline: "Southwest Airlines",
      flightNumber: "WN 1652 · WN 2387",
      departTime: "1:20 PM PST",
      arriveTime: "11:55 PM EST",
      duration: "7h 35m",
      stops: "1 stop · DEN",
    },
    notes: "Scheduled times are local to each airport, checked October 23. Arrival connection: SAN 6:55–7:30 PM PDT. Return connection: WN 1652 reaches DEN at 4:55 PM MST; WN 2387 departs DEN at 6:40 PM MST and arrives TPA at 11:55 PM EST. Denver layover: 1h 45m. Calendar SFO pickup: October 23, 8:30–9:30 PM; drop-off: November 3, 11:30 AM–12:30 PM (California time).",
  },
  {
    id: "sanjay",
    name: "Sanjay",
    initials: "SA",
    status: "Flight confirmed",
    homeBase: "Columbus, Indiana",
    arrival: {
      date: "2026-10-23",
      origin: "ORD",
      destination: "SFO",
      airline: "American Airlines",
      flightNumber: "AA 1954",
      departTime: "6:55 PM CDT",
      arriveTime: "9:56 PM PDT",
      duration: "5h 01m",
      stops: "Nonstop",
    },
    departure: {
      date: "2026-11-01",
      origin: "SFO",
      destination: "ORD",
      airline: "American Airlines",
      flightNumber: "AA 2436",
      departTime: "8:47 AM PST",
      arriveTime: "3:15 PM CST",
      duration: "4h 28m",
      stops: "Nonstop",
    },
    notes: "Scheduled times are local to each airport, checked October 23. ORD Terminal 3 ↔ SFO Terminal 1. Calendar SFO pickup: October 23, 9:30–10:30 PM; shared airport drop-off: November 1, 6:30–7:30 AM (California time).",
  },
  {
    id: "rishi",
    name: "Rishi",
    initials: "RI",
    status: "Local",
    homeBase: "San Francisco, California",
    arrival: { date: "2026-10-23" },
    departure: { date: "2026-11-03" },
    notes: "Local traveler · No flight needed.",
  },
  {
    id: "ashwin",
    name: "Ashwin",
    initials: "AS",
    status: "Flight confirmed",
    homeBase: "Cincinnati, Ohio",
    arrival: {
      date: "2026-10-24",
      origin: "CVG",
      destination: "SFO",
      departTime: "9:05 AM EDT",
      arriveTime: "1:40 PM PDT",
      airline: "Southwest Airlines",
      flightNumber: "WN 1291 · WN 4367",
      duration: "7h 35m",
      stops: "1 stop · MDW",
    },
    departure: {
      date: "2026-11-01",
      origin: "SFO",
      destination: "CVG",
      departTime: "9:05 AM PST",
      arriveTime: "7:35 PM EST",
      airline: "Southwest Airlines",
      flightNumber: "WN 4357 · WN 878",
      duration: "7h 30m",
      stops: "1 stop · AUS",
    },
    notes: "Scheduled times are local to each airport, checked October 23. Arrival: WN 1291 CVG 9:05 AM EDT → MDW 9:20 AM CDT; WN 4367 MDW 11:05 AM CDT → SFO 1:40 PM PDT. Midway layover: 1h 45m. Return: WN 4357 SFO 9:05 AM PST → AUS 2:40 PM CST; WN 878 AUS 4:05 PM CST → CVG 7:35 PM EST. Austin layover: 1h 25m. Calendar SFO pickup: October 24, 1–2 PM; drop-off: November 1, 6:30–7:30 AM (California time).",
  },
  {
    id: "nirosha",
    name: "Nirosha",
    initials: "NI",
    status: "Flight confirmed",
    homeBase: "Cincinnati, Ohio",
    arrival: {
      date: "2026-10-24",
      origin: "CVG",
      destination: "SFO",
      departTime: "9:05 AM EDT",
      arriveTime: "1:40 PM PDT",
      airline: "Southwest Airlines",
      flightNumber: "WN 1291 · WN 4367",
      duration: "7h 35m",
      stops: "1 stop · MDW",
    },
    departure: {
      date: "2026-11-01",
      origin: "SFO",
      destination: "CVG",
      departTime: "9:05 AM PST",
      arriveTime: "7:35 PM EST",
      airline: "Southwest Airlines",
      flightNumber: "WN 4357 · WN 878",
      duration: "7h 30m",
      stops: "1 stop · AUS",
    },
    notes: "Scheduled times are local to each airport, checked October 23. Arrival: WN 1291 CVG 9:05 AM EDT → MDW 9:20 AM CDT; WN 4367 MDW 11:05 AM CDT → SFO 1:40 PM PDT. Midway layover: 1h 45m. Return: WN 4357 SFO 9:05 AM PST → AUS 2:40 PM CST; WN 878 AUS 4:05 PM CST → CVG 7:35 PM EST. Austin layover: 1h 25m. Calendar SFO pickup: October 24, 1–2 PM; drop-off: November 1, 6:30–7:30 AM (California time).",
  },
  {
    id: "deepa",
    name: "Deepa",
    initials: "DE",
    status: "Host",
    homeBase: "Bay Area, California",
    arrival: {},
    departure: {},
    notes: "Host · No flight details needed.",
  },
  {
    id: "harshith",
    name: "Harshith",
    initials: "HA",
    status: "Host",
    homeBase: "Bay Area, California",
    arrival: {},
    departure: {},
    notes: "Host · No flight details needed.",
  },
];
