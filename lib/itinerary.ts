import type { Cost } from "../data/trip";

export function parseItineraryNotes(description?: string) {
  const lines = description?.split(/\r?\n/) ?? [];
  let cost: Cost = { kind: "tbd" };
  let phone: string | undefined;
  const flights: string[] = [];
  const noteLines: string[] = [];

  for (const line of lines) {
    const costMatch = line.match(/^\s*(?:[-–—]\s*)*cost\b\s*:?[ \t]*(.*)$/i);
    if (costMatch) {
      const label = costMatch[1].trim();
      if (label && cost.kind === "tbd") cost = { kind: "custom", label };
      continue;
    }

    const phoneMatch = line.match(/^\s*(?:[-–—]\s*)*phone\b\s*:?[ \t]*(.*)$/i);
    if (phoneMatch) {
      const value = phoneMatch[1].trim();
      if (value && !phone) phone = value;
      continue;
    }

    const flightsMatch = line.match(/^\s*(?:[-–—]\s*)*flights?\b\s*:?[ \t]*(.*)$/i);
    if (flightsMatch) {
      const values = flightsMatch[1].toUpperCase().match(/[A-Z0-9]{2}\s*\d{1,4}[A-Z]?/g) ?? [];
      for (const value of values) {
        const flight = value.replace(/\s+/g, "");
        if (!flights.includes(flight)) flights.push(flight);
      }
      continue;
    }
    noteLines.push(line);
  }

  return { cost, phone, flights, notes: noteLines.join("\n").trim() || undefined };
}
