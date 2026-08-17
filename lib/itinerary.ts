import type { Cost } from "../data/trip";

export function parseItineraryNotes(description?: string) {
  const lines = description?.split(/\r?\n/) ?? [];
  let cost: Cost = { kind: "tbd" };
  const noteLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(?:[-–—]\s*)*cost\b\s*:?[ \t]*(.*)$/i);
    if (match && cost.kind === "tbd") {
      const label = match[1].trim();
      if (label) cost = { kind: "custom", label };
      continue;
    }
    noteLines.push(line);
  }

  return { cost, notes: noteLines.join("\n").trim() || undefined };
}
