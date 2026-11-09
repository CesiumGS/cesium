// A ray's accuracy through the frames module (frames 5b, Task 7): the route
// from a lunar site to the Earth carries MOON_ME's estimated term.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

describe("ray accuracy through the frames module", () => {
  let engine: Engine;
  let world: World;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.removeWorld(world);
  });

  it("a ray from a lunar site carries MOON_ME's estimated term in its note and metres", async () => {
    world = engine.createWorld();
    // Synthetic data, precise: MOON_ME runs on its data and states the
    // library's estimate. (The synthetic GCRF is not rigid, so the route
    // stays inside the Moon's subtree: a probe bound to MOON_ICRF.)
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    await catalog.ready("MOON_ME", "precise");
    await catalog.ready("MOON_ICRF", "precise");
    const resolver = createFramesResolver(catalog, { precision: "precise" });
    engine.cameras.setResolver(world, resolver);
    const probe = world.addAnchor("probe");
    resolver.bindAnchor(probe, catalog.get("MOON_ICRF"));
    world.bodyAnchor(MOON);
    const seconds = Instant.fromTdb(0).toUtc(LeapSeconds.builtIn()) / 1000;
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: probe,
      seconds,
      // At 1,737.4 km from the Moon's centre, outward.
      rays: [{ from: [1_737_400, 0, 0], to: [1_800_000, 0, 0] }],
      targets: [{ kind: "body", body: MOON }],
    });
    const ray = answer.rays[0]!;
    expect(ray.accuracy.note).toMatch(/MOON_ME \(estimated\) ±0\.52/);
    expect(ray.accuracy.meters).toBeCloseTo(3e-7 * 1_737_400, 6);
  });
});
