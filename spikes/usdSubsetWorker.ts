// The subset reader in a module worker, for the start-time measurement in
// usdSubset.ts. It posts "ready" once its module has loaded, then answers
// each request with the fixture's composed prim count and its own timings.
// Spike code for CS-833 and CS-843; not part of @cesium/next.

import { loadLayers, Stage, type Prim } from "./usd-subset/compose.ts";
import { FIXTURE } from "./usd-subset/fixture.ts";

const io = {
  read: (p: string) =>
    Promise.resolve(
      FIXTURE[p] === undefined
        ? undefined
        : new TextEncoder().encode(FIXTURE[p]),
    ),
  exists: (p: string) => Promise.resolve(p in FIXTURE),
};

const count = (p: Prim): number =>
  p.children.reduce((s, c) => s + count(c), p.path === "/" ? 0 : 1);

self.addEventListener("message", async () => {
  const t0 = performance.now();
  const layers = await loadLayers("fixture/root.usda", io);
  const prim = new Stage(layers, "fixture/root.usda").compose();
  self.postMessage({ prims: count(prim), ms: performance.now() - t0 });
});
self.postMessage({ ready: true });
