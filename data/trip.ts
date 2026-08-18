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
  locations: ["Big Sur", "Santa Cruz", "Lake Tahoe", "San Francisco", "Sunnyvale"],
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
        startTime: "9:05 PM",
        duration: "Pickup timing TBD",
        location: "San Francisco International Airport (SFO)",
        flights: ["WN3074"],
        cost: { kind: "tbd" },
        notes: "Sourav lands on Southwest WN 3074. Rishi’s arrival details are still pending.",
      },
    ],
  },
  { day: 1, date: "2026-10-24", destination: "Assemble", tone: "coral", activities: [openPlan("d1-a1", "The crew assembles", "San Francisco area · TBD")] },
  { day: 2, date: "2026-10-25", destination: "Big Sur", tone: "sun", activities: [openPlan("d2-a1", "Big Sur day", "Big Sur")] },
  { day: 3, date: "2026-10-26", destination: "Santa Cruz", tone: "coral", activities: [openPlan("d3-a1", "Santa Cruz day", "Santa Cruz")] },
  { day: 4, date: "2026-10-27", destination: "Lake Tahoe", tone: "lake", activities: [openPlan("d4-a1", "Lake Tahoe · day one", "Lake Tahoe")] },
  { day: 5, date: "2026-10-28", destination: "Lake Tahoe", tone: "pine", activities: [openPlan("d5-a1", "Lake Tahoe · day two", "Lake Tahoe")] },
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
      departTime: "4:50 PM",
      arriveTime: "9:05 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 3074",
      duration: "7h 15m",
      stops: "1 stop · SAN",
    },
    departure: {
      date: "2026-11-03",
      origin: "SFO",
      destination: "TPA",
      departTime: "1:20 PM",
      arriveTime: "11:55 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 1652",
      duration: "7h 35m",
      stops: "1 stop · DEN",
    },
  },
  {
    id: "sanjay",
    name: "Sanjay",
    initials: "SA",
    status: "Flight pending",
    homeBase: "Columbus, Indiana",
    arrival: {},
    departure: {},
    notes: "Flight details awaiting confirmation.",
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
      departTime: "9:05 AM",
      arriveTime: "1:40 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 1291 · WN 4367",
      duration: "7h 35m",
      stops: "1 stop · MDW",
    },
    departure: {
      date: "2026-11-01",
      origin: "SFO",
      destination: "CVG",
      departTime: "9:05 AM",
      arriveTime: "7:35 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 4357 · WN 878",
      duration: "7h 30m",
      stops: "1 stop · AUS",
    },
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
      departTime: "9:05 AM",
      arriveTime: "1:40 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 1291 · WN 4367",
      duration: "7h 35m",
      stops: "1 stop · MDW",
    },
    departure: {
      date: "2026-11-01",
      origin: "SFO",
      destination: "CVG",
      departTime: "9:05 AM",
      arriveTime: "7:35 PM",
      airline: "Southwest Airlines",
      flightNumber: "WN 4357 · WN 878",
      duration: "7h 30m",
      stops: "1 stop · AUS",
    },
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
