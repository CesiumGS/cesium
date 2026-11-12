// Compiled routes in the renderer (plan 2026-11-12, task 4b): a draw whose
// route crosses warps with smooth specs is drawn by the route's compiled
// `transformVertex` (scene/world/routes.ts), not by fits. On the CPU, against
// the route's own float64 map, as warpGlobe.test.ts does for fits; the GPU's
// side of it is spikes/transformGraph.ts (`routeVertex`) and spikes/warpGlobe.ts.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { routeForward } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import {
  heightOffset,
  verticalExaggeration,
} from "../src/frames/heightWarps.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { warpFrame, type WarpSpec } from "../src/frames/warpFrame.ts";
import { scaleAbout } from "../src/frames/warps.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as m4 from "../src/math/mat4.ts";
import {
  ROUTE_BODY,
  ROUTE_KIND,
  routeBlockRows,
} from "../src/scene/routeVariant.ts";
import { EARTH } from "../src/scene/Body.ts";
import { createBox } from "../src/scene/meshes.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { smooth, TransformGraph } from "../src/transform/graph.ts";
import { routeBetween } from "../src/transform/route.ts";
import {
  CENTER_WORD,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
} from "../src/render/layout.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { fittedOnly } from "./fittedOnly.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6_378_137;
const WGS84 = Ellipsoid.WGS84;
let engine: Engine;
const worlds: World[] = [];
const views: View[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
});

afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
});

const at = (height: number) =>
  Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + height, 0, 0, 1);

async function setup(
  make: (scale: ReturnType<World["createPlacementParameter"]>) => WarpSpec,
) {
  const world = engine.createWorld({ maxDraws: 8 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const scale = world.createPlacementParameter(1, { range: [0, 1] });
  const frame = warpFrame("x", catalog.get("ITRF"), make(scale));
  catalog.add(frame);
  engine.cameras.setResolver(world, createFramesResolver(catalog));
  const earth = world.bodyAnchor(EARTH);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame },
    orientation: { kind: "free" },
  });
  const mesh = createBox();
  const transform = world.addTransform(at(1000), earth);
  const draw = world.addDraw({ mesh: world.addMesh(mesh), transform });
  const step = () => {
    engine.cameras.update();
    world.warps.frame(
      engine.cameras.root(view),
      view.anchorRoutes(),
      Infinity,
      (m) => {
        throw new Error(m);
      },
    );
  };
  // A route's pipelines are made asynchronously: draws wait for them across ticks.
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      step();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    step();
  };
  await settle();
  return { world, view, earth, scale, mesh, transform, draw, step, settle };
}

/** The draw's block in the placements buffer: its rows as words, and the row it starts at. */
function blockOf(world: World, draw: DrawHandle) {
  const row =
    world.raster.recordsU32[draw.index * RECORD_WORDS + PLACEMENT_WORD]!;
  const anchor = world.warps.routes.routeOf(draw.index)!;
  const rows = routeBlockRows(anchor.compiled);
  const { f32, u32 } = world.raster.placementTable.rowWords(row, rows);
  return { row, f32: Float32Array.from(f32), u32: Uint32Array.from(u32) };
}

const cart = (longitude: number, latitude: number, height: number) =>
  WGS84.cartographicToCartesian(
    { longitude, latitude, height },
    new Float64Array(3),
  ) as Float64Array;

describe("compiled routes in the renderer", () => {
  it("draws a smooth warp's draw by its route, with no fit", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    expect(s.world.warpStats()).toMatchObject({ fitsRun: 0 });
    expect(s.world.warpStats().draws.routed).toBe(1);
    expect(s.world.warps.routes.has(s.draw.index)).toBe(true);
    const anchor = s.world.warps.routes.routeOf(s.draw.index)!;
    const block = blockOf(s.world, s.draw);
    // One term: a compiled route's, weighted 1, whose body follows the header and term.
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]! & 255).toBe(ROUTE_KIND);
    expect(block.f32[5]).toBe(1);
    expect(block.u32[6]).toBe(ROUTE_BODY);
    expect(block.u32[7]).toBe(anchor.uniformRow);
    // Its centre record is the compiler's, made in float64 for the route's value at the draw's centre.
    const body = ROUTE_BODY * 4;
    const centre = [0, 1, 2].map((a) => block.f32[body + a]!);
    const placed = m4.transformPoint(
      new Float64Array(3),
      s.world.drawMatrix(s.draw)!,
      Float64Array.from(centre),
    );
    const want = new Float32Array(anchor.compiled.perDrawLayout.floats);
    anchor.compiled.centreConstants(
      placed,
      anchor.values,
      anchor.bridged.route,
      want,
    );
    const start = (ROUTE_BODY + 4) * 4;
    expect(Array.from(block.f32.subarray(start, start + want.length))).toEqual(
      Array.from(want),
    );
    // The block's route is the camera route's map in float64.
    const camera = s.view.anchorRoute(s.earth)!;
    const p = Float64Array.of(R + 1000, 12, -7);
    const got = anchor.bridged.route.forward(p, new Float64Array(3));
    const expected = routeForward(camera, p, new Float64Array(3));
    for (let a = 0; a < 3; a++) {
      expect(got[a]).toBeCloseTo(expected[a]!, 3);
    }
  });

  it("writes a slider's change to the route's uniforms, not to the draw's block or a fit", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    const anchor = s.world.warps.routes.routeOf(s.draw.index)!;
    expect(anchor.compiled.separableParams.length).toBeGreaterThan(0);
    const before = blockOf(s.world, s.draw);
    const uniforms = Float32Array.from(anchor.uniforms);
    const recordOf = () =>
      Array.from(
        { length: RECORD_WORDS },
        (_, k) => s.world.raster.recordsU32[s.draw.index * RECORD_WORDS + k]!,
      );
    const record = recordOf();
    s.scale.value = 0.4;
    await s.settle();
    const after = blockOf(s.world, s.draw);
    expect(Array.from(after.u32)).toEqual(Array.from(before.u32));
    expect(Array.from(anchor.uniforms)).not.toEqual(Array.from(uniforms));
    expect(recordOf()).toEqual(record);
    expect(s.world.warpStats()).toMatchObject({ fitsRun: 0 });
    // The route's map is the warp's at the new scale: height 1000 m goes to 1000·(1 + 0.4·9).
    const p = cart(0, 0, 1000);
    const out = anchor.bridged.route.forward(p, new Float64Array(3));
    const height = WGS84.cartesianToCartographic(out, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!.height;
    expect(height).toBeCloseTo(1000 * (1 + 0.4 * 9), 2);
  });

  it("remakes the draw's centre record when a dynamic parameter changes", async () => {
    const warp = verticalExaggeration({ factor: 10 });
    const s = await setup(() => warp);
    const before = blockOf(s.world, s.draw);
    const version = s.world.warps.routes.routeOf(s.draw.index)!.version;
    warp.baseHeight = 400;
    await s.settle();
    const anchor = s.world.warps.routes.routeOf(s.draw.index)!;
    const after = blockOf(s.world, s.draw);
    expect(anchor.version).toBeGreaterThan(version);
    expect(Array.from(after.f32)).not.toEqual(Array.from(before.f32));
    expect(s.world.warpStats()).toMatchObject({ fitsRun: 0 });
  });

  it("keeps a warp with no smooth spec on fits", async () => {
    const s = await setup((scale) =>
      fittedOnly(verticalExaggeration({ factor: 10, scale })),
    );
    expect(s.world.warpStats().draws.routed).toBe(0);
    expect(s.world.warps.routes.has(s.draw.index)).toBe(false);
    expect(s.world.warpStats().fitsRun).toBeGreaterThan(0);
  });

  it("holds the drawn volume's sphere over the drawn vertices, at both ends of the slider", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    const anchor = s.world.warps.routes.routeOf(s.draw.index)!;
    const m = s.world.drawMatrix(s.draw)!;
    const o = s.draw.index * RECORD_WORDS;
    for (const value of [1, 0.4, 0]) {
      s.scale.value = value;
      await s.settle();
      const sphere = s.world.warps.routes.base(s.draw.index);
      expect(sphere).toBeDefined();
      const record = s.world.raster.recordsF32;
      const c = Array.from(
        { length: 3 },
        (_, a) => record[o + CENTER_WORD + a]!,
      );
      const radius = record[o + RADIUS_WORD]!;
      const to = m4.multiply(m4.mat4(), anchor.affine, m);
      const scale = Math.max(
        Math.hypot(to[0]!, to[1]!, to[2]!),
        Math.hypot(to[4]!, to[5]!, to[6]!),
        Math.hypot(to[8]!, to[9]!, to[10]!),
      );
      const centreOut = m4.transformPoint(
        new Float64Array(3),
        to,
        Float64Array.from(c),
      );
      const out = new Float64Array(3);
      for (let i = 0; i < s.mesh.positions.length / 3; i++) {
        const v = Float64Array.from(
          [0, 1, 2].map((a) => s.mesh.positions[3 * i + a]!),
        );
        const q = m4.transformPoint(new Float64Array(3), m, v);
        anchor.bridged.route.forward(q, out);
        const d = Math.hypot(
          out[0]! - centreOut[0]!,
          out[1]! - centreOut[1]!,
          out[2]! - centreOut[2]!,
        );
        expect(d).toBeLessThanOrEqual(radius * scale);
      }
    }
  });

  it("turns a warp helper's smooth spec into a route that matches its own function", () => {
    const point = cart(0.13, 0.8, 0);
    const cases = [
      verticalExaggeration({ factor: 3, baseHeight: 200 }),
      heightOffset(500),
      scaleAbout(point, [1.5, 2, 3]),
    ];
    for (const warp of cases) {
      const spec = warp.smooth!;
      expect(spec.source).toBeDefined();
      const graph = new TransformGraph();
      const root = graph.root("parent");
      const node = graph.add("warp", root, smooth({ ...spec, id: "w" }));
      const route = routeBetween(node, root);
      const out = new Float64Array(3);
      for (const h of [-100, 0, 1500, 4800]) {
        const p = cart(0.1301, 0.8002, h);
        const got = route.forward(p, out);
        const want = warp.forward(p, new Float64Array(3));
        for (let a = 0; a < 3; a++) {
          expect(got[a]).toBeCloseTo((want as ArrayLike<number>)[a]!, 3);
        }
      }
    }
  });
});
