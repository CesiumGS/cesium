// The first route to compile loads Cesium IR (CS-794). Under a curvilinear map the
// world asks for it on the first tick and keeps the draws held (hidden, as before
// a first fit; no fit is run for them) until it has loaded; the loop stays awake
// meanwhile, and the next tick compiles the route and draws by it. This file
// loads nothing of Cesium IR itself, so what it finds installed is the world's.
import { beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../packages/next/src/frames/catalog.ts";
import { curvilinearFrame } from "../packages/next/src/frames/curvilinearFrame.ts";
import { createFramesResolver } from "../packages/next/src/frames/resolver.ts";
import { verticalExaggeration } from "../packages/core/src/georeference/heightCurvilinearMaps.ts";
import { EARTH } from "../packages/core/src/scene/Body.ts";
import { createBox } from "../packages/core/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import { irPasses } from "../packages/core/src/transform/lazyIr.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6_378_137;
let engine: Engine;

beforeAll(async () => {
  engine = await fakeEngine();
});

describe("the first compiled route", () => {
  it("holds the draw while Cesium IR loads, runs no fit, then draws it by its route", async () => {
    const world = engine.createWorld({ maxDraws: 8 });
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const frame = curvilinearFrame(
      "x",
      itrf,
      verticalExaggeration({ factor: 10 }),
    );
    catalog.add(frame);
    const resolver = createFramesResolver(catalog);
    const earth = world.bodyAnchor(EARTH);
    resolver.bindAnchor(earth, frame);
    engine.cameras.setResolver(world, resolver);
    const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    const transform = world.addTransform(
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + 1000, 0, 0, 1),
      earth,
    );
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      transform,
    });
    const step = () => {
      engine.cameras.update();
      return world.curvilinearMaps.frame(
        [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
        Infinity,
        (m) => {
          throw new Error(m);
        },
      );
    };

    // Nothing has asked for Cesium IR yet: a view with no curvilinear map never does.
    expect(irPasses()).toBeUndefined();

    // The first tick asks for it. The draw waits: not routed, not fitted, and the loop stays awake.
    expect(step()).toBe(true);
    expect(world.curvilinearMaps.routes.pending).toBe(true);
    expect(world.curvilinearMaps.routes.has(draw.index)).toBe(false);
    expect(world.curvilinearStats().draws.routed).toBe(0);
    expect(world.curvilinearStats().fitsRun).toBe(0);
    expect(world.curvilinearMaps.status(draw)?.state).not.toBe("fitted");

    // Ticks go on until it is here (a moment: one dynamic import), and the draw is routed from the tick after.
    await expect
      .poll(
        () => {
          step();
          return irPasses() !== undefined;
        },
        { timeout: 5000 },
      )
      .toBe(true);
    // A route's pipelines are made asynchronously: draws wait for them across ticks.
    await expect
      .poll(
        () => {
          step();
          return world.curvilinearMaps.status(draw)?.state;
        },
        { timeout: 5000 },
      )
      .toBe("fitted");
    expect(world.curvilinearMaps.routes.has(draw.index)).toBe(true);
    expect(world.curvilinearStats().draws.routed).toBe(1);
    expect(world.curvilinearStats().fitsRun).toBe(0);
    expect(world.curvilinearMaps.routes.pending).toBe(false);
  });
});
