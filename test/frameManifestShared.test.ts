// A frame catalog's providers read the store's manifest.json once (CS-706):
// through the shared loads (CS-708) for a catalog with a signal, or once per
// catalog without one. On the stubbed store of test/frameStore.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../packages/next/src/frames/catalog.ts";
import {
  sharedLoadCount,
  sharedManifestCount,
} from "../packages/next/src/frames/sharedLoads.ts";
import {
  DATA_FILES,
  STORE,
  fetchCounts,
  nextTask,
  serveFrameStore,
  type StoreRequest,
} from "./frameStore.ts";

/** Reference frames from both providers (Earth orientation, ephemeris). */
const SKY = ["GCRF", "ITRF", "HCRS", "MOON_ICRF", "MOON_ME"] as const;

let requests: StoreRequest[];

beforeEach(async () => {
  requests = await serveFrameStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  await nextTask();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function skyCatalog(signal?: AbortSignal) {
  const catalog = createFrameCatalog(
    signal ? { data: STORE, signal } : { data: STORE },
  );
  for (const name of SKY) {
    catalog.get(name, { precision: "precise" });
  }
  return catalog;
}

const precise = (catalog: ReturnType<typeof skyCatalog>) =>
  Promise.all(SKY.map((name) => catalog.ready(name, "precise")));

describe("the store's manifest", () => {
  it("is fetched once for both providers of a catalog with a signal", async () => {
    const abort = new AbortController();
    const catalog = skyCatalog(abort.signal);
    await precise(catalog);
    const counts = fetchCounts(requests);
    expect(counts["manifest.json"]).toBe(1);
    for (const file of DATA_FILES) {
      expect(counts[file]).toBe(1);
    }
    abort.abort();
  });

  it("is fetched once through a catalog made, disposed and made again in one tick", async () => {
    const first = new AbortController();
    skyCatalog(first.signal);
    first.abort();
    const second = new AbortController();
    const catalog = skyCatalog(second.signal);
    await precise(catalog);
    expect(fetchCounts(requests)["manifest.json"]).toBe(1);
    second.abort();
  });

  it("is fetched once for a catalog without a signal, which loads on its own", async () => {
    await precise(skyCatalog());
    await precise(skyCatalog());
    // Once per catalog: two catalogs without signals share nothing.
    expect(fetchCounts(requests)["manifest.json"]).toBe(2);
    expect(sharedManifestCount()).toBe(0);
  });

  it("is let go with the loads that use it", async () => {
    const abort = new AbortController();
    await precise(skyCatalog(abort.signal));
    expect(sharedManifestCount()).toBe(1);
    abort.abort();
    // The loads stop a task after their last holder; the manifest with them.
    await nextTask();
    expect(sharedLoadCount()).toBe(0);
    expect(sharedManifestCount()).toBe(0);
    // The next catalog fetches it again.
    requests.length = 0;
    const again = new AbortController();
    await precise(skyCatalog(again.signal));
    expect(fetchCounts(requests)["manifest.json"]).toBe(1);
    again.abort();
  });

  it("is not kept when it failed: the next catalog tries again", async () => {
    const stub = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) =>
      String(input).endsWith("manifest.json")
        ? new Response("down", { status: 503 })
        : stub(input, init),
    );
    const failing = new AbortController();
    const catalog = skyCatalog(failing.signal);
    await Promise.all(
      SKY.map((name) => catalog.ready(name, "precise").catch(() => {})),
    );
    expect(sharedManifestCount()).toBe(0);
    failing.abort();
    vi.stubGlobal("fetch", stub);
    requests.length = 0;
    const next = new AbortController();
    await precise(skyCatalog(next.signal));
    expect(fetchCounts(requests)["manifest.json"]).toBe(1);
    next.abort();
  });
});
