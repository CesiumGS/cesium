// Compiled routes in the renderer (plan 2026-11-12, task 4b): a draw whose
// route crosses curvilinear maps with curvilinear specs is drawn by the route's compiled
// `transformVertex` (scene/world/routes.ts), not by fits. On the CPU, against
// the route's own float64 map, as curvilinearGlobe.test.ts does for fits; the GPU's
// side of it is spikes/transformGraph.ts (`routeVertex`) and spikes/curvilinearGlobe.ts.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  routeForward,
  type CurvilinearFrameSpec,
} from "../packages/next/src/camera/route.ts";
import { createFrameCatalog } from "../packages/next/src/frames/catalog.ts";
import {
  heightOffset,
  verticalExaggeration,
} from "../packages/next/src/georeference/heightCurvilinearMaps.ts";
import { createFramesResolver } from "../packages/next/src/frames/resolver.ts";
import { curvilinearFrame } from "../packages/next/src/frames/curvilinearFrame.ts";
import { scaleAbout } from "../packages/next/src/transforms/scaleAbout.ts";
import { Ellipsoid } from "../packages/next/src/math/ellipsoid.ts";
import * as m4 from "../packages/next/src/math/mat4.ts";
import {
  ROUTE_BODY,
  ROUTE_KIND,
  ROUTE_POINTER_ROWS,
  routeBlockRows,
} from "../packages/next/src/scene/routeVariant.ts";
import { EARTH } from "../packages/next/src/scene/Body.ts";
import { createBox } from "../packages/next/src/scene/meshes.ts";
import { OffscreenTarget } from "../packages/next/src/scene/renderTarget.ts";
import {
  curvilinear,
  TransformGraph,
} from "../packages/next/src/transform/graph.ts";
import { routeBetween } from "../packages/next/src/transform/route.ts";
import {
  CENTER_WORD,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
} from "../packages/next/src/render/layout.ts";
import type { Engine } from "../packages/next/src/scene/Engine.ts";
import type { View } from "../packages/next/src/scene/View.ts";
import type { World } from "../packages/next/src/scene/World.ts";
import type { DrawHandle } from "../packages/next/src/scene/world/types.ts";
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
  make: (
    scale: ReturnType<World["createPlacementParameter"]>,
  ) => CurvilinearFrameSpec,
) {
  const world = engine.createWorld({ maxDraws: 8 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const scale = world.createPlacementParameter(1, { range: [0, 1] });
  const itrf = catalog.get("ITRF");
  const frame = curvilinearFrame("x", itrf, make(scale));
  catalog.add(frame);
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  resolver.bindAnchor(earth, frame);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: itrf },
    orientation: { kind: "free" },
  });
  const mesh = createBox();
  const transform = world.addTransform(at(1000), earth);
  const draw = world.addDraw({ mesh: world.addMesh(mesh), transform });
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
    world.draws.recordsU32[draw.index * RECORD_WORDS + PLACEMENT_WORD]!;
  const anchor = world.curvilinearMaps.routes.routeOf(draw.index)!;
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
  it("draws a curvilinear map's draw by its route, with no fit", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    expect(s.world.curvilinearStats()).toMatchObject({ fitsRun: 0 });
    expect(s.world.curvilinearStats().draws.routed).toBe(1);
    expect(s.world.curvilinearMaps.routes.has(s.draw.index)).toBe(true);
    const anchor = s.world.curvilinearMaps.routes.routeOf(s.draw.index)!;
    const block = blockOf(s.world, s.draw);
    // One term: a compiled route's, weighted 1, whose body follows the header and term.
    expect(block.u32[0]).toBe(1);
    expect(block.u32[4]! & 255).toBe(ROUTE_KIND);
    expect(block.f32[5]).toBe(1);
    expect(block.u32[6]).toBe(ROUTE_BODY);
    expect(block.u32[7]).toBe(anchor.pointerRow);
    // The pointer table names this view's uniforms.
    const pointers = s.world.raster.placementTable.rowWords(
      anchor.pointerRow,
      ROUTE_POINTER_ROWS,
    ).u32;
    expect(pointers[engine.scene.viewIds.get(s.view)!]).toBe(anchor.uniformRow);
    // Its center record is the compiler's, made in float64 for the route's value at the draw's center.
    const body = ROUTE_BODY * 4;
    const center = [0, 1, 2].map((a) => block.f32[body + a]!);
    const placed = m4.transformPoint(
      new Float64Array(3),
      s.world.drawMatrix(s.draw)!,
      Float64Array.from(center),
    );
    const want = new Float32Array(anchor.compiled.perDrawLayout.floats);
    anchor.compiled.centerConstants(
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
    const anchor = s.world.curvilinearMaps.routes.routeOf(s.draw.index)!;
    expect(anchor.compiled.separableParams.length).toBeGreaterThan(0);
    const before = blockOf(s.world, s.draw);
    const uniforms = Float32Array.from(anchor.uniforms);
    const recordOf = () =>
      Array.from(
        { length: RECORD_WORDS },
        (_, k) => s.world.draws.recordsU32[s.draw.index * RECORD_WORDS + k]!,
      );
    const record = recordOf();
    s.scale.value = 0.4;
    await s.settle();
    const after = blockOf(s.world, s.draw);
    expect(Array.from(after.u32)).toEqual(Array.from(before.u32));
    expect(Array.from(anchor.uniforms)).not.toEqual(Array.from(uniforms));
    expect(recordOf()).toEqual(record);
    expect(s.world.curvilinearStats()).toMatchObject({ fitsRun: 0 });
    // The route's map is the curvilinear map's at the new scale: height 1000 m goes to 1000·(1 + 0.4·9).
    const p = cart(0, 0, 1000);
    const out = anchor.bridged.route.forward(p, new Float64Array(3));
    const height = WGS84.cartesianToCartographic(out, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!.height;
    expect(height).toBeCloseTo(1000 * (1 + 0.4 * 9), 2);
  });

  it("remakes the draw's center record when a dynamic parameter changes", async () => {
    const curvilinearMap = verticalExaggeration({ factor: 10 });
    const s = await setup(() => curvilinearMap);
    const before = blockOf(s.world, s.draw);
    const version = s.world.curvilinearMaps.routes.routeOf(
      s.draw.index,
    )!.version;
    curvilinearMap.baseHeight = 400;
    await s.settle();
    const anchor = s.world.curvilinearMaps.routes.routeOf(s.draw.index)!;
    const after = blockOf(s.world, s.draw);
    expect(anchor.version).toBeGreaterThan(version);
    expect(Array.from(after.f32)).not.toEqual(Array.from(before.f32));
    expect(s.world.curvilinearStats()).toMatchObject({ fitsRun: 0 });
  });

  it("keeps a curvilinear map with no curvilinear spec on fits", async () => {
    const s = await setup((scale) =>
      fittedOnly(verticalExaggeration({ factor: 10, scale })),
    );
    expect(s.world.curvilinearStats().draws.routed).toBe(0);
    expect(s.world.curvilinearMaps.routes.has(s.draw.index)).toBe(false);
    expect(s.world.curvilinearStats().fitsRun).toBeGreaterThan(0);
  });

  it("holds the drawn volume's sphere over the drawn vertices, at both ends of the slider", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    const anchor = s.world.curvilinearMaps.routes.routeOf(s.draw.index)!;
    const m = s.world.drawMatrix(s.draw)!;
    const o = s.draw.index * RECORD_WORDS;
    for (const value of [1, 0.4, 0]) {
      s.scale.value = value;
      await s.settle();
      const sphere = s.world.curvilinearMaps.routes.base(s.draw.index);
      expect(sphere).toBeDefined();
      const record = s.world.draws.recordsF32;
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
      const centerOut = m4.transformPoint(
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
          out[0]! - centerOut[0]!,
          out[1]! - centerOut[1]!,
          out[2]! - centerOut[2]!,
        );
        expect(d).toBeLessThanOrEqual(radius * scale);
      }
    }
  });

  it("gives each view its own value of a parameter: its route, its uniforms, no fit", async () => {
    const s = await setup((scale) =>
      verticalExaggeration({ factor: 10, scale }),
    );
    const itrf = engine.cameras.root(s.view);
    const other = engine.addView({
      target: new OffscreenTarget(64, 48),
      world: s.world,
    });
    views.push(other);
    engine.cameras.setRig(other, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    const ids = [s.view, other].map((v) => engine.scene.viewIds.get(v)!);
    const step = () => {
      engine.cameras.update();
      s.world.curvilinearMaps.frame(
        [s.view, other].map((v, i) => ({
          id: ids[i]!,
          routes: v.anchorRoutes(),
        })),
        Infinity,
        (m) => {
          throw new Error(m);
        },
      );
    };
    for (let i = 0; i < 4; i++) {
      step();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    other.setParameter(s.scale, 0.2);
    expect(other.parameterValue(s.scale)).toBe(0.2);
    expect(s.view.parameterValue(s.scale)).toBe(1);
    for (let i = 0; i < 3; i++) {
      step();
    }
    const first = s.view.anchorRoute(s.earth)!;
    const second = other.anchorRoute(s.earth)!;
    const stretch = (r: typeof first) => {
      const p = cart(0, 0, 1000);
      const out = routeForward(r, p, new Float64Array(3));
      return (
        WGS84.cartesianToCartographic(out, {
          longitude: 0,
          latitude: 0,
          height: 0,
        })!.height / 1000
      );
    };
    expect(stretch(first)).toBeCloseTo(10, 3);
    expect(stretch(second)).toBeCloseTo(1 + 0.2 * 9, 3);
    // One program and one record; the uniforms are the views' own, and the table points each view at its.
    const anchor = s.world.curvilinearMaps.routes.routeOf(s.draw.index)!;
    const view2 = anchor.others.get(ids[1]!);
    expect(view2).toBeDefined();
    expect(Array.from(view2!.uniforms)).not.toEqual(
      Array.from(anchor.uniforms),
    );
    const pointers = s.world.raster.placementTable.rowWords(
      anchor.pointerRow,
      ROUTE_POINTER_ROWS,
    ).u32;
    expect(pointers[ids[0]!]).toBe(anchor.uniformRow);
    expect(pointers[ids[1]!]).toBe(view2!.uniformRow);
    expect(s.world.curvilinearStats()).toMatchObject({ fitsRun: 0 });
    // Clearing it returns the view to the world's value.
    other.setParameter(s.scale, undefined);
    expect(other.hasParameterValue(s.scale)).toBe(false);
    for (let i = 0; i < 3; i++) {
      step();
    }
    expect(stretch(other.anchorRoute(s.earth)!)).toBeCloseTo(10, 3);
  });
  it("turns a curvilinear map helper's curvilinear spec into a route that matches its own function", () => {
    const point = cart(0.13, 0.8, 0);
    const cases = [
      verticalExaggeration({ factor: 3, baseHeight: 200 }),
      heightOffset(500),
      scaleAbout(point, [1.5, 2, 3]),
    ];
    for (const curvilinearMap of cases) {
      const spec = curvilinearMap.curvilinear!;
      expect(spec.source).toBeDefined();
      const graph = new TransformGraph();
      const root = graph.root("parent");
      const node = graph.add(
        "curvilinear",
        root,
        curvilinear({ ...spec, id: "w" }),
      );
      const route = routeBetween(node, root);
      const out = new Float64Array(3);
      for (const h of [-100, 0, 1500, 4800]) {
        const p = cart(0.1301, 0.8002, h);
        const got = route.forward(p, out);
        const want = curvilinearMap.forward(p, new Float64Array(3));
        for (let a = 0; a < 3; a++) {
          expect(got[a]).toBeCloseTo((want as ArrayLike<number>)[a]!, 3);
        }
      }
    }
  });
});
