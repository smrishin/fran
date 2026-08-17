export type Cost =
  | { kind: "free" }
  | { kind: "per-person"; amount?: number }
  | { kind: "group"; amount?: number }
  | { kind: "tbd" };

export type Activity = {
  id: string;
  title: string;
  startTime?: string;
  duration?: string;
  location?: string;
  cost: Cost;
  notes?: string;
  placeholder?: boolean;
};

export type ItineraryDay = {
  day: number;
  date?: string;
  destination: string;
  tone: "coral" | "lake" | "pine" | "sun";
  activities: Activity[];
  placeholder?: boolean;
};

export type Guest = {
  id: string;
  name: string;
  initials: string;
  arrival: {
    date?: string;
    time?: string;
    location?: string;
    airline?: string;
    flightNumber?: string;
  };
  departure: {
    date?: string;
    time?: string;
    location?: string;
    airline?: string;
    flightNumber?: string;
  };
  notes?: string;
  placeholder?: boolean;
};

export const trip = {
  workingName: "Fog & Fire",
  tagline: "California · One wild week",
  dates: { start: undefined, end: undefined } as { start?: string; end?: string },
  locations: ["San Francisco", "Lake Tahoe", "Santa Cruz", "Sunnyvale"],
  calendar: {
    source: "iCloud public calendar",
    apiPath: "/api/calendar",
  },
};

// These days use only themes supplied in the brief. Every item remains a
// clearly labeled planning placeholder until confirmed trip details arrive.
export const itinerary: ItineraryDay[] = [
  {
    day: 1,
    destination: "San Francisco",
    tone: "coral",
    placeholder: true,
    activities: [
      { id: "d1-a1", title: "Airport pickups", startTime: "TBD", duration: "TBD", location: "Airport TBD", cost: { kind: "tbd" }, placeholder: true },
      { id: "d1-a2", title: "Welcome dinner", startTime: "TBD", duration: "TBD", location: "San Francisco · TBD", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
  {
    day: 2,
    destination: "Lake Tahoe",
    tone: "lake",
    placeholder: true,
    activities: [
      { id: "d2-a1", title: "Drive to Tahoe", startTime: "TBD", duration: "TBD", location: "Route TBD", cost: { kind: "tbd" }, placeholder: true },
      { id: "d2-a2", title: "Boating", startTime: "TBD", duration: "TBD", location: "Lake Tahoe · TBD", cost: { kind: "tbd" }, placeholder: true },
      { id: "d2-a3", title: "Camp setup", startTime: "TBD", duration: "TBD", location: "Campsite TBD", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
  {
    day: 3,
    destination: "Lake Tahoe",
    tone: "pine",
    placeholder: true,
    activities: [
      { id: "d3-a1", title: "Open planning block", startTime: "TBD", duration: "TBD", location: "Lake Tahoe", cost: { kind: "tbd" }, notes: "Add confirmed activities later.", placeholder: true },
    ],
  },
  {
    day: 4,
    destination: "Santa Cruz",
    tone: "sun",
    placeholder: true,
    activities: [
      { id: "d4-a1", title: "Santa Cruz day", startTime: "TBD", duration: "TBD", location: "Santa Cruz · TBD", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
  {
    day: 5,
    destination: "San Francisco",
    tone: "coral",
    placeholder: true,
    activities: [
      { id: "d5-a1", title: "Alcatraz", startTime: "TBD", duration: "TBD", location: "San Francisco", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
  {
    day: 6,
    destination: "Sunnyvale",
    tone: "lake",
    placeholder: true,
    activities: [
      { id: "d6-a1", title: "Sunnyvale plans", startTime: "TBD", duration: "TBD", location: "Sunnyvale · TBD", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
  {
    day: 7,
    destination: "Halloween",
    tone: "pine",
    placeholder: true,
    activities: [
      { id: "d7-a1", title: "Halloween plans", startTime: "TBD", duration: "TBD", location: "TBD", cost: { kind: "tbd" }, placeholder: true },
    ],
  },
];

export const guests: Guest[] = [
  {
    id: "guest-01",
    name: "Traveler 01",
    initials: "01",
    arrival: {},
    departure: {},
    notes: "Replace with confirmed traveler details.",
    placeholder: true,
  },
  {
    id: "guest-02",
    name: "Traveler 02",
    initials: "02",
    arrival: {},
    departure: {},
    notes: "Replace with confirmed traveler details.",
    placeholder: true,
  },
  {
    id: "guest-03",
    name: "Traveler 03",
    initials: "03",
    arrival: {},
    departure: {},
    notes: "Add or remove cards as the guest list is confirmed.",
    placeholder: true,
  },
];
