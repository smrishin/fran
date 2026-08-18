import assert from "node:assert/strict";
import test from "node:test";
import { parseIcs } from "../lib/ics.ts";
import { parseItineraryNotes } from "../lib/itinerary.ts";

test("reads the iCalendar URL field", () => {
  const source = [
    "BEGIN:VEVENT",
    "UID:kayaking",
    "SUMMARY:Kayaking",
    "DTSTART:20261025T090000",
    "URL:https://example.com/book",
    "END:VEVENT",
  ].join("\n");

  assert.equal(parseIcs(source)[0].url, "https://example.com/book");
});

test("extracts a case-insensitive cost line and keeps the remaining notes", () => {
  const details = parseItineraryNotes("Bring a jacket.\nCost $20 per person\nMeet by the dock.");

  assert.deepEqual(details.cost, { kind: "custom", label: "$20 per person" });
  assert.equal(details.notes, "Bring a jacket.\nMeet by the dock.");
});

test("accepts dashed cost lines", () => {
  const details = parseItineraryNotes("Boats are reserved.\n--cost $180 for the group");

  assert.deepEqual(details.cost, { kind: "custom", label: "$180 for the group" });
  assert.equal(details.notes, "Boats are reserved.");
});

test("extracts a case-insensitive phone line and keeps it out of notes", () => {
  const details = parseItineraryNotes("Ask for the group table.\n--PHONE: +1 (831) 555-0123");

  assert.equal(details.phone, "+1 (831) 555-0123");
  assert.equal(details.notes, "Ask for the group table.");
});

test("extracts flight numbers and keeps them out of notes", () => {
  const details = parseItineraryNotes("Meet at baggage claim.\nFlights WN1291 WN4367");

  assert.deepEqual(details.flights, ["WN1291", "WN4367"]);
  assert.equal(details.notes, "Meet at baggage claim.");
});
