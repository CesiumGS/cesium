// Point sources across a warp (plan 13.26, increment 4, the points and pools
// the first slice left unwarped): a `PointSource`'s frame kernel carries each
// point through the route as it writes its anchor (vector/points.slang
// `placeAnchor`), over the fit of a hidden carrier draw the world's warps
// make like any draw's. The cull, the quads and a `ModelPool`, which read
// the anchors, need nothing. Checked on the CPU against the route's float64
// map: the carrier's twin lands each point on `routeForward` within the
// fit's error. The kernel on the GPU is spikes/warpPoints.html.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { routeForward, type Route } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { smoothFrame } from "../src/frames/smoothFrame.ts";
import * as m4 from "../src/math/mat4.ts";
import {
  FLAGS_WORD,
  NO_PLACEMENT,
  RECORD_WORDS,
  RecordFlags,
  VIEW_MASK_WORD,
} from "../src/render/layout.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import { placeWithTerms, weightOf } from "../src/scene/warpEvaluate.ts";
import type { World } from "../src/scene/World.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import type { AnchorHandle } from "../src/scene/world/types.ts";
import { PointSource } from "../src/vector/PointSource.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6371e3;
const K = 10;

/** Height above a sphere of radius R about the origin times K, with its Jacobian. */
function exaggerate(
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = R + K * (r - R);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (K - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

const UP = [0.6, 0.7, Math.sqrt(1 - 0.36 - 0.49)] as const;
/** A source's origin: 1 km above the sphere, in the direction UP. */
const ORIGIN = Float64Array.of(
  UP[0] * (R + 1000),
  UP[1] * (R + 1000),
  UP[2] * (R + 1000),
);

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];
const sources: PointSource[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
});

afterEach(() => {
  for (const source of sources.splice(0)) {
    source.destroy();
  }
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
});

interface Setup {
  world: World;
  view: View;
  earth: AnchorHandle;
  step(budget?: number): boolean;
}

/** A world and a view on ITRF; the Earth's anchor is placed in `exaggerated` under ITRF (or in ITRF itself when `rigid`). */
function setup(options: { rigid?: boolean; prime?: boolean } = {}): Setup {
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const exaggerated = smoothFrame("exaggerated", itrf, {
    revision: 1,
    description: `height × ${K}`,
    forward: (p, out, jacobian) => exaggerate(p, out, jacobian),
  });
  catalog.add(exaggerated);
  const earth = world.bodyAnchor(EARTH);
  const resolver = createFramesResolver(catalog);
  resolver.bindAnchor(earth, options.rigid ? itrf : exaggerated);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const s: Setup = {
    world,
    view,
    earth,
    step(budget = Infinity) {
      engine.cameras.update();
      return world.warps.frame(
        [{ id: engine.scene.viewIds.get(view)!, routes: view.anchorRoutes() }],
        budget,
        (message) => {
          throw new Error(message);
        },
      );
    },
  };
  if (options.prime !== false) {
    s.step();
  }
  return s;
}

function source(s: Setup): PointSource {
  const made = new PointSource(engine, s.world, {
    capacity: 8,
    origin: ORIGIN,
    anchor: s.earth,
    warpRadius: 20_000,
  });
  sources.push(made);
  return made;
}

describe("a point source across a warp", () => {
  it("is held until its carrier's first fit, then has a block in the placements buffer", () => {
    const s = setup();
    const made = source(s);
    expect(s.world.placementOf(made.carrier).held).toBe(true);
    expect(s.world.placementOf(made.carrier).row).toBe(NO_PLACEMENT);
    expect(s.step(0)).toBe(false);
    const placed = s.world.placementOf(made.carrier);
    expect(placed.held).toBe(false);
    expect(placed.row).not.toBe(NO_PLACEMENT);
    // Never drawn: no view, so no cull or selection cost either.
    expect(
      s.world.raster.recordsU32[
        made.carrier.index * RECORD_WORDS + VIEW_MASK_WORD
      ],
    ).toBe(0);
  });

  it("carries each point through the route, within the fit's error", () => {
    const s = setup();
    const made = source(s);
    s.step();
    const terms = drawTerms(s.world, made.carrier)!;
    const matrix = s.world.drawMatrix(made.carrier)!;
    const place = s.view.anchorPlacement(s.earth);
    const route: Route = s.view.anchorRoute(s.earth)!;
    const last = terms.at(-1)!;
    const bound =
      last.term.kind === "cubic"
        ? last.term.errorBound * Math.abs(weightOf(last.weight))
        : 0;
    expect(bound).toBeLessThanOrEqual(0.05);
    let moved = 0;
    const out = new Float64Array(3);
    for (const p of [
      [0, 0, 0],
      [1_000, 500, 30],
      [-8_000, 3_000, 120],
      [15_000, -12_000, 400],
    ]) {
      placeWithTerms(terms, p, undefined, out);
      const inAnchor = m4.transformPoint(new Float64Array(3), matrix, out);
      const drawn = m4.transformPoint(new Float64Array(3), place, inAnchor);
      const at = m4.transformPoint(
        new Float64Array(3),
        matrix,
        Float64Array.from(p),
      );
      const want = routeForward(route, at);
      const error = Math.hypot(
        drawn[0]! - want[0]!,
        drawn[1]! - want[1]!,
        drawn[2]! - want[2]!,
      );
      expect(error).toBeLessThanOrEqual(bound + 1e-6);
      moved = Math.max(
        moved,
        Math.hypot(out[0]! - p[0]!, out[1]! - p[1]!, out[2]! - p[2]!),
      );
    }
    // 1 km up at k = 10 is 9 km of displacement.
    expect(moved).toBeGreaterThan(8_000);
  });

  it("has no block, and holds nothing, under a rigid route", () => {
    const s = setup({ rigid: true });
    const made = source(s);
    s.step();
    expect(s.world.placementOf(made.carrier)).toEqual({
      row: NO_PLACEMENT,
      held: false,
    });
  });

  it("says nothing of a source's points, and once of a point set no source owns", () => {
    const s = setup({ prime: false });
    const made = source(s);
    // The source's mesh is drawn by a layer's draw: not placed, not reported.
    const draw = s.world.addDraw({
      mesh: made.mesh,
      parent: s.earth,
      origin: ORIGIN,
      radius: 1_000,
      billboard: { size: 1 },
    });
    expect(() => s.step()).not.toThrow();
    expect(drawTerms(s.world, draw)).toBeUndefined();
    // A point set no source owns is reported (the test's reporter throws).
    expect(() =>
      s.world.addDraw({
        mesh: s.world.addPointMesh(4),
        parent: s.earth,
        origin: ORIGIN,
        radius: 1_000,
        billboard: { size: 1 },
      }),
    ).toThrow(/a point set no PointSource owns/);
  });

  it("leaves the draws of a pool alone: its source's points carry the warp", () => {
    const s = setup();
    const made = source(s);
    const identity = new Float32Array(32);
    identity.set(m4.mat4(), 0);
    identity.set(m4.mat4(), 16);
    const draw = s.world.addDraw({
      mesh: s.world.addMesh({
        positions: Float32Array.of(0, 0, 0, 1, 0, 0, 0, 1, 0),
        indices: Uint32Array.of(0, 1, 2),
      }),
      parent: s.earth,
      origin: ORIGIN,
      instances: { matrices: identity },
    });
    s.world.markGpuInstances(draw);
    // Not placed, not held, and not reported (the test's reporter throws).
    expect(() => s.step()).not.toThrow();
    expect(drawTerms(s.world, draw)).toBeUndefined();
    expect(s.world.warps.status(draw)).toBeUndefined();
    expect(
      s.world.raster.recordsU32[draw.index * RECORD_WORDS + FLAGS_WORD]! &
        RecordFlags.hidden,
    ).toBe(0);
    // The source's frame kernel is what moves its points.
    expect(s.world.placementOf(made.carrier).row).not.toBe(NO_PLACEMENT);
  });
});
