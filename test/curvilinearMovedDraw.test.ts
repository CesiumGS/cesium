import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../packages/frames/src/catalog.ts";
import { verticalExaggeration } from "../packages/core/src/georeference/heightCurvilinearMaps.ts";
import { createFramesResolver } from "../packages/frames/src/resolver.ts";
import { curvilinearFrame } from "../packages/frames/src/curvilinearFrame.ts";
import { Ellipsoid } from "../packages/core/src/math/ellipsoid.ts";
import * as m4 from "../packages/core/src/math/mat4.ts";
import { EARTH } from "../packages/core/src/scene/Body.ts";
import { createBox } from "../packages/core/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import { placeWithTerms } from "../packages/core/src/scene/curvilinearEvaluate.ts";
import { drawTerms } from "../packages/core/src/scene/world/placements.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { fittedOnly } from "./fittedOnly.ts";

const R = 6_378_137;
let engine: Engine;
const worlds: World[] = [];
beforeAll(async () => {
  engine = await fakeEngine();
});
afterEach(() => {});

describe("scratch", () => {
  it("moves", () => {
    const world = engine.createWorld({ maxDraws: 8 });
    worlds.push(world);
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const scale = world.createPlacementParameter(1, { range: [0, 1] });
    const itrf = catalog.get("ITRF");
    const frame = curvilinearFrame(
      "x",
      itrf,
      fittedOnly(verticalExaggeration({ factor: 10, scale })),
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
    const mesh = createBox();
    const t = world.addTransform(
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + 1000, 0, 0, 1),
      earth,
    );
    const draw = world.addDraw({ mesh: world.addMesh(mesh), transform: t });
    const step = () => {
      engine.cameras.update();
      world.curvilinearMaps.frame(
        [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
        Infinity,
        (m) => {
          throw new Error(m);
        },
      );
    };
    const drawnHeight = () => {
      const terms = drawTerms(world, draw)!;
      const out = new Float64Array(3);
      const v = [0, 1, 2].map((a) => mesh.positions[a]!);
      placeWithTerms(terms, v, () => undefined, out);
      const p = m4.transformPoint(
        new Float64Array(3),
        world.drawMatrix(draw)!,
        out as unknown as Float64Array,
      );
      return Ellipsoid.WGS84.cartesianToCartographic(p, {
        longitude: 0,
        latitude: 0,
        height: 0,
      })!.height;
    };
    step();
    const a = drawnHeight();
    world.setTransform(
      t,
      Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + 3000, 0, 0, 1),
    );
    step();
    step();
    const b = drawnHeight();
    // ×10 of the height of its first vertex: 1,000 m up, then 3,000 m.
    expect(a).toBeCloseTo(10_005, 2);
    expect(b).toBeCloseTo(30_005, 2);
    expect(world.curvilinearStats()).toMatchObject({
      moved: 1,
      refits: 0,
      fitsRun: 2,
    });
  });
});
