import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { itinerary, trip } from "../data/trip.ts";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the locked Campfire Code gate", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Fog &amp; Fire/);
  assert.match(html, /Campfire Code/);
  assert.match(html, /seven days/);
  assert.match(html, /OCT 23 — NOV 01/);
  assert.match(html, /Add Fog &amp; Fire to your home screen/);
  assert.match(html, /href="\/install"/);
  assert.match(html, /favicon-32\.png/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /City lights|Traveler 01|codex-preview|react-loading-skeleton/);
});

test("serves the installable app manifest", async () => {
  const response = await render("/manifest.webmanifest");
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.short_name, "Fog & Fire");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
});

test("starts the trip with a Day 0 arrivals plan", () => {
  assert.equal(trip.dates.start, "2026-10-23");
  assert.equal(itinerary[0].day, 0);
  assert.equal(itinerary[0].date, trip.dates.start);
  assert.equal(itinerary[0].destination, "Touchdown");
  assert.match(itinerary[0].activities[0].title, /arrivals/i);
});

test("renders official Chrome install help for iPhone and Android", async () => {
  const response = await render("/install");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Google Chrome’s official guide/);
  assert.match(html, /GENIE\.Platform%3DiOS/);
  assert.match(html, /GENIE\.Platform%3DAndroid/);
});

test("keeps the unlocked dashboard and last calendar available offline", async () => {
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.match(worker, /CACHE_APP/);
  assert.match(worker, /data-fog-fire-dashboard/);
  assert.match(worker, /\/api\/calendar/);
  assert.match(worker, /request\.mode === "navigate"/);
});
