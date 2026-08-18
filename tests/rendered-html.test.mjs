import assert from "node:assert/strict";
import test from "node:test";

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

test("renders official Chrome install help for iPhone and Android", async () => {
  const response = await render("/install");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Google Chrome’s official guide/);
  assert.match(html, /GENIE\.Platform%3DiOS/);
  assert.match(html, /GENIE\.Platform%3DAndroid/);
});
