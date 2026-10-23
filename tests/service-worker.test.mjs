import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function serviceWorker() {
  const handlers = new Map();
  const deletedCaches = [];
  vm.runInNewContext(source, {
    self: {
      location: { origin: "https://trip.example" },
      clients: { claim: async () => {} },
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    URL,
    caches: {
      open: async () => {
        throw new Error("Live game requests must not open the offline cache");
      },
      keys: async () => ["fog-fire-offline-v2", "fog-fire-offline-v3", "another-app"],
      delete: async (name) => { deletedCaches.push(name); },
    },
  });
  return { handlers, deletedCaches };
}

test("Hangout polling and private questions bypass stale offline API responses", () => {
  const { handlers } = serviceWorker();
  for (const path of ["/api/hangout", "/api/hangout?refresh=1", "/api/hangout/question", "/api/hangout/identity"]) {
    let intercepted = false;
    handlers.get("fetch")({
      request: new Request(`https://trip.example${path}`),
      respondWith() { intercepted = true; },
    });
    assert.equal(intercepted, false, `${path} must go directly to the network`);
  }
});

test("activation removes the old cache containing stale lobby and private prompt responses", async () => {
  const { handlers, deletedCaches } = serviceWorker();
  let activation;
  handlers.get("activate")({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deletedCaches, ["fog-fire-offline-v2"]);
});
