import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { questTasks } from "../data/quest.ts";
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

test("defines a separate 16-slot Quest board without inventing final challenges", () => {
  assert.equal(questTasks.length, 16);
  assert.equal(new Set(questTasks.map((task) => task.id)).size, 16);
  assert.ok(questTasks.every((task) => /Challenge slot/.test(task.title)));
  assert.ok(questTasks.every((task) => /will be added/.test(task.description)));
});

test("keeps Quest data private and uses shared object storage", async () => {
  const response = await render("/api/quest");
  assert.equal(response.status, 401);

  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  const storage = await readFile(new URL("../lib/quest-storage.ts", import.meta.url), "utf8");
  assert.equal(hosting.r2, "STORAGE");
  assert.match(storage, /`bingo\//);
  assert.doesNotMatch(storage, /BINGO_PHOTOS/);
});

test("Quest modals dismiss cleanly and memories can be saved", async () => {
  const questView = await readFile(new URL("../components/QuestView.tsx", import.meta.url), "utf8");

  assert.match(questView, /event\.key === "Escape"/);
  assert.match(questView, /aria-label="Close challenge"/);
  assert.match(questView, /aria-label="Close memory"/);
  assert.match(questView, /navigator\.share/);
  assert.match(questView, /link\.download = file\.name/);
  assert.match(questView, /quest-lightbox-backdrop/);
  assert.match(questView, /quest-lightbox-details-toggle/);
  assert.match(questView, /Save photo/);
});

test("Glow Reel progressively reveals memories and supports gallery navigation", async () => {
  const questView = await readFile(new URL("../components/QuestView.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(questView, /PAGE_SIZE = 10/);
  assert.match(questView, /IntersectionObserver/);
  assert.match(questView, /completions\.slice\(0, visibleCount\)/);
  assert.match(questView, /Previous memory/);
  assert.match(questView, /Next memory/);
  assert.match(questView, /ArrowLeft/);
  assert.match(questView, /beginSwipe/);
  assert.match(styles, /prefers-color-scheme: dark/);
  assert.match(styles, /\.quest-scrapbook \{ background: #111814/);
});

test("mobile Plan groups itinerary and dates while Hangout reuses trip identities", async () => {
  const dashboard = await readFile(new URL("../components/TripDashboard.tsx", import.meta.url), "utf8");
  const hangout = await readFile(new URL("../components/HangoutView.tsx", import.meta.url), "utf8");
  const quest = await readFile(new URL("../components/QuestView.tsx", import.meta.url), "utf8");
  const games = await import("../data/hangout.ts");

  assert.match(dashboard, /id: "hangout", label: "Hangout"/);
  assert.match(dashboard, /item\.id !== "calendar"/);
  assert.match(dashboard, /MobilePlanTabs/);
  assert.match(dashboard, />Itinerary<\/button>/);
  assert.match(dashboard, />Dates<\/button>/);
  assert.match(hangout, /fog-fire-hangout-player/);
  assert.match(hangout, /GuestIdentityPicker/);
  assert.match(quest, /GuestIdentityPicker/);
  assert.equal(games.hangoutGames.length, 1);
  assert.equal(games.hangoutGames[0].id, "crossed-wires");
});

test("Crossed Wires keeps private prompts behind a player-only endpoint", async () => {
  const lobbyResponse = await render("/api/hangout?playerId=rishi");
  const questionResponse = await render("/api/hangout/question?playerId=rishi");
  const client = await readFile(new URL("../components/CrossedWiresGame.tsx", import.meta.url), "utf8");
  const storage = await readFile(new URL("../lib/hangout-storage.ts", import.meta.url), "utf8");
  const questionRoute = await readFile(new URL("../app/api/hangout/question/route.ts", import.meta.url), "utf8");

  assert.equal(lobbyResponse.status, 401);
  assert.equal(questionResponse.status, 401);
  assert.doesNotMatch(client, /crossed-wires-questions/);
  assert.doesNotMatch(client, /you are (?:the )?imposter/i);
  assert.doesNotMatch(client, /question\?playerId/);
  assert.match(questionRoute, /HANGOUT_IDENTITY_COOKIE_NAME/);
  assert.match(questionRoute, /verifyHangoutIdentityToken/);
  assert.match(storage, /return \{ roundId: round\.id, question:/);
  assert.match(storage, /round\.status === "revealed"/);
});

test("Crossed Wires supports a reusable lobby and host-controlled rounds", async () => {
  const client = await readFile(new URL("../components/CrossedWiresGame.tsx", import.meta.url), "utf8");
  const questions = await import("../lib/crossed-wires-questions.ts");

  assert.ok(questions.crossedWiresQuestionPairs.length >= 3);
  assert.ok(questions.crossedWiresQuestionPairs.every((pair) => pair.mainQuestion && pair.imposterQuestion));
  assert.match(client, /create.*join.*leave.*start.*next.*reveal.*end/s);
  assert.match(client, /Show my question/);
  assert.match(client, /Hide my question/);
  assert.match(client, /Reveal the questions\? Make sure everyone has made their guess first\./);
  assert.match(client, /Next round/);
  assert.match(client, /setInterval/);
});
