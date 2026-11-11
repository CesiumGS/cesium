// A world's draws across a warp (plan §13.26, increment 1, slice D): a view
// whose rig sits on a warp frame (`exaggerated`, over ITRF) draws content
// anchored in ITRF warped, per vertex, by fits of the route, which the
// engine makes within a budget. Checked on the CPU against the route's own
// float64 map: the twin of every vertex (`placeWithTerms`, then the anchor
// and draw matrices) lands on `routeForward` within the fit's error. The
// GPU side is spikes/warpRoute.html.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  PresentationRouteError,
  routeForward,
  type Route,
} from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { Frame } from "../src/frames/Frame.ts";
import { placementOf } from "../src/frames/placementQuery.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { warpFrame, type WarpSpec } from "../src/frames/warpFrame.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import {
  CENTER_WORD,
  FLAGS_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
} from "../src/render/layout.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import type { PlacementParameter } from "../src/scene/placement.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { placeWithTerms, weightOf } from "../src/scene/warpEvaluate.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";
import type { World } from "../src/scene/World.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { drawnTile } from "../src/streaming/tileWarp.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6371e3;
const PARTNER = "_PARTNER";
const BASE = "https://tiles.test/warped/";
const URL_ = `${BASE}tileset.json`;

/** Height above a sphere of radius R about the origin times `k`, with its Jacobian. */
function exaggerate(
  k: number,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = R + k * (r - R);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (k - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

/** A quad `half` metres across in its xy plane, with a partner position 2 m up in z. */
function quad(half = 1): MeshData {
  const h = half;
  return {
    positions: Float32Array.of(-h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0),
    indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
    attributes: {
      [PARTNER]: {
        data: Float32Array.of(-h, -h, 2, h, -h, 2, h, h, 2, -h, h, 2),
        components: 3,
      },
    },
  };
}

/** One triangle, one draw, the default material (as test/earthAnchor.test.ts). */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** A one-tile tileset 3 km above the equator and prime meridian. */
const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 640,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R + 3000, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

const UP = (() => {
  const z = Math.sqrt(1 - 0.36 - 0.49);
  return [0.6, 0.7, z] as const;
})();

/** Where a quad sits: 3 km above the sphere, in the direction UP. */
const ORIGIN = Float64Array.of(
  UP[0] * (R + 3000),
  UP[1] * (R + 3000),
  UP[2] * (R + 3000),
);

let engine: Engine;
const views: View[] = [];
const worlds: World[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
  vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
});

afterEach(() => {
  for (const view of views.splice(0)) {
    engine.removeView(view);
  }
  for (const world of worlds.splice(0)) {
    engine.removeWorld(world);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
});

interface Setup {
  world: World;
  view: View;
  earth: AnchorHandle;
  /** The warped anchor's frames. */
  itrf: Frame;
  exaggerated: Frame;
  /** Whatever the rig sits on. */
  rig: Frame;
  spec: WarpSpec & { revision: number };
  /** The exaggeration `spec.forward` applies, changed with a revision bump. */
  state: { k: number };
  /** The warp's scale, when it has one. */
  scale: PlacementParameter | undefined;
  resolver: ReturnType<typeof createFramesResolver>;
  catalog: ReturnType<typeof createFrameCatalog>;
  /** Fits run by the cache so far. */
  fits: { count: number };
  /** One frame of the warp context, `budget` ms of fits. */
  step(budget?: number): boolean;
}

/**
 * A world with a view whose rig sits on `exaggerated` (or on `flat`, a
 * second warp under it, when `second`; on ITRF itself when `rigid`), over
 * ITRF, and the Earth's anchor. `scaled`: the warp has a scale, a world's
 * parameter (a weight the GPU reads) or a `plain` number. The first frame
 * has run, so draws added after are found as they are added.
 */
function setup(
  options: {
    scaled?: "world" | "plain";
    /** The world scale's range (`createPlacementParameter`). */
    range?: [number, number];
    second?: boolean;
    rigid?: boolean;
    prime?: boolean;
    k?: number;
  } = {},
): Setup {
  const world = engine.createWorld({ maxDraws: 64 });
  worlds.push(world);
  const catalog = createFrameCatalog({ data: syntheticFrameData() });
  const itrf = catalog.get("ITRF");
  const scale: PlacementParameter | undefined =
    options.scaled === "world"
      ? world.createPlacementParameter(
          1,
          options.range ? { range: options.range } : undefined,
        )
      : options.scaled === "plain"
        ? { value: 1 }
        : undefined;
  const state = { k: options.k ?? 10 };
  const spec: WarpSpec & { revision: number } = {
    presentation: true,
    revision: 1,
    description: "height × k",
    ...(scale && { scale }),
    forward: (p, out, jacobian) => exaggerate(state.k, p, out, jacobian),
  };
  const exaggerated = warpFrame("exaggerated", itrf, spec);
  catalog.add(exaggerated);
  let rig: Frame = options.rigid ? itrf : exaggerated;
  if (options.second) {
    const flat = warpFrame("flat", exaggerated, {
      presentation: true,
      revision: 1,
      description: "lifted 1 m",
      forward(p, out, jacobian) {
        out[0] = p[0]!;
        out[1] = p[1]!;
        out[2] = p[2]! + 1;
        jacobian?.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        return out;
      },
    });
    catalog.add(flat);
    rig = flat;
  }
  const resolver = createFramesResolver(catalog);
  const earth = world.bodyAnchor(EARTH);
  engine.cameras.setResolver(world, resolver);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  views.push(view);
  engine.cameras.setRig(view, {
    position: { frame: rig },
    orientation: { kind: "free" },
  });
  const fits = { count: 0 };
  const run = world.warps.cache.run.bind(world.warps.cache);
  vi.spyOn(world.warps.cache, "run").mockImplementation((budget, now) => {
    const n = run(budget, now);
    fits.count += n;
    return n;
  });
  const s: Setup = {
    world,
    view,
    earth,
    itrf,
    exaggerated,
    rig,
    spec,
    state,
    scale,
    resolver,
    catalog,
    fits,
    step(budget = Infinity) {
      engine.cameras.update();
      return world.warps.frame(
        engine.cameras.root(view),
        view.anchorRoutes(),
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

function addQuad(
  s: Setup,
  options: { half?: number; origin?: Float64Array; model?: Float64Array } = {},
): DrawHandle {
  const mesh = s.world.addMesh(quad(options.half));
  return s.world.addDraw({
    mesh,
    parent: s.earth,
    origin: options.origin ?? ORIGIN,
    ...(options.model && { model: options.model }),
  });
}

const hidden = (s: Setup, draw: DrawHandle): boolean =>
  (s.world.raster.recordsU32[draw.index * RECORD_WORDS + FLAGS_WORD]! &
    RecordFlags.hidden) !==
  0;

const route = (s: Setup): Route => s.view.anchorRoute(s.earth)!;

/** The draw's route lattice: its terms' last. */
function lattice(s: Setup, draw: DrawHandle): CubicLattice | undefined {
  const terms = drawTerms(s.world, draw);
  const last = terms?.at(-1)?.term;
  return last?.kind === "cubic" ? last : undefined;
}

/**
 * The worst distance between where the draw's terms put its mesh's vertices
 * (anchor placement, draw matrix, terms) and where `routeForward` puts
 * them, and the lattice's error bound there (m).
 */
function twinError(
  s: Setup,
  draw: DrawHandle,
  mesh: MeshData,
): { worst: number; bound: number } {
  const terms = drawTerms(s.world, draw)!;
  const matrix = s.world.drawMatrix(draw)!;
  const place = s.view.anchorPlacement(s.earth);
  const r = route(s);
  const partner = mesh.attributes![PARTNER]!.data;
  let worst = 0;
  const out = new Float64Array(3);
  for (let i = 0; i < mesh.positions.length / 3; i++) {
    const v = [0, 1, 2].map((a) => mesh.positions[i * 3 + a]!);
    const near = (semantic: string) =>
      semantic === PARTNER
        ? [0, 1, 2].map((a) => partner[i * 3 + a]!)
        : undefined;
    placeWithTerms(terms, v, near, out);
    const inAnchor = m4.transformPoint(
      new Float64Array(3),
      matrix,
      out as unknown as Float64Array,
    );
    const drawn = m4.transformPoint(new Float64Array(3), place, inAnchor);
    const at = m4.transformPoint(
      new Float64Array(3),
      matrix,
      Float64Array.from(v),
    );
    const want = routeForward(r, at);
    worst = Math.max(
      worst,
      Math.hypot(
        drawn[0]! - want[0]!,
        drawn[1]! - want[1]!,
        drawn[2]! - want[2]!,
      ),
    );
  }
  const l = terms.at(-1)!;
  const bound =
    l.term.kind === "cubic"
      ? l.term.errorBound * Math.abs(weightOf(l.weight))
      : 0;
  return { worst, bound };
}

describe("anchors across a warp", () => {
  it("places an anchor by its route's affine part, and marks it with the route", () => {
    const s = setup();
    const r = route(s);
    expect(r.steps.map((x) => x.kind)).toEqual(["warp"]);
    expect(r.presentation).toBe(true);
    expect(r.revision).toBe(s.resolver.routeRevision(s.earth, s.rig));
    expect(Array.from(s.view.anchorPlacement(s.earth))).toEqual(
      Array.from(m4.mat4()),
    );
    // The table's root, bound to nothing, is rigid and unmarked.
    expect(s.view.anchorRoute(undefined)).toBeUndefined();
    // Where a rigid step precedes the warp, the placement is that step.
    const mast = Frame.constant("mast", s.itrf, translation(10, 20, 30), {
      accuracy: { meters: 0.3, note: "survey" },
    });
    s.catalog.add(mast);
    const site = s.world.addAnchor("site");
    s.resolver.bindAnchor(site, mast);
    s.step();
    const through = s.view.anchorRoute(site)!;
    expect(through.steps.map((x) => x.kind)).toEqual(["rigid", "warp"]);
    expect(Array.from(s.view.anchorPlacement(site))).toEqual(
      Array.from(translation(10, 20, 30)),
    );
  });

  it("leaves an anchor on a rigid route as it was, with no route", () => {
    const s = setup();
    const mast = Frame.constant("mast", s.exaggerated, translation(5, 6, 7), {
      accuracy: { meters: 0.3, note: "survey" },
    });
    s.catalog.add(mast);
    const site = s.world.addAnchor("site");
    s.resolver.bindAnchor(site, mast);
    s.step();
    expect(s.view.anchorRoute(site)).toBeUndefined();
    expect(Array.from(s.view.anchorPlacement(site))).toEqual(
      Array.from(translation(5, 6, 7)),
    );
  });

  it("refuses a rig whose own frame crosses a warp to the root, keeping its last pose, with a clear message", () => {
    const s = setup();
    engine.cameras.setRig(s.view, {
      position: { frame: s.exaggerated, anchor: s.earth, offset: [0, 0, 10] },
      orientation: { kind: "free" },
    });
    const held = engine.cameras.held(s.view);
    expect(held?.reason).toMatch(/crosses a warp/);
    expect(held?.reason).toMatch(/rig's frames/);
  });
});

function translation(x: number, y: number, z: number): Float64Array {
  const m = m4.mat4();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

describe("draws across a warp", () => {
  it("fits each draw: a lattice term whose twin lands on the route within its error", () => {
    const s = setup();
    const draws = [
      addQuad(s),
      addQuad(s, { half: 500, origin: ORIGIN.map((v) => v * 1.0001) }),
      addQuad(s, { half: 20, origin: ORIGIN.map((v) => v * 0.9999) }),
    ];
    const meshes = [quad(), quad(500), quad(20)];
    s.step();
    draws.forEach((draw, i) => {
      const l = lattice(s, draw);
      expect(l, `draw ${i}`).toBeDefined();
      const { worst, bound } = twinError(s, draw, meshes[i]!);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
      expect(bound).toBeLessThanOrEqual(1e-3);
      // 3 km up at k = 10 moves a vertex by 9 × 3 km.
      const moved = Math.hypot(
        ...(lattice(s, draw)!.coefficients.slice(0, 3) as unknown as number[]),
      );
      expect(moved).toBeGreaterThan(20_000);
    });
    expect(s.world.warps.size).toBe(3);
    expect(s.world.warps.pending).toBe(0);
  });

  it("holds a draw hidden until its first fit, and keeps a stale fit drawn while it is refitted", () => {
    const s = setup();
    const draws = [addQuad(s), addQuad(s), addQuad(s)];
    // Hidden as added, before any frame could draw them unwarped.
    expect(draws.map((d) => hidden(s, d))).toEqual([true, true, true]);
    // A frame with no budget runs one fit.
    expect(s.step(0)).toBe(true);
    expect(draws.filter((d) => hidden(s, d))).toHaveLength(2);
    expect(draws.filter((d) => lattice(s, d))).toHaveLength(1);
    expect(s.world.warps.pending).toBe(2);
    expect(s.step(0)).toBe(true);
    expect(draws.filter((d) => hidden(s, d))).toHaveLength(1);
    expect(s.step(0)).toBe(false);
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false, false]);
    expect(draws.map((d) => s.world.warps.status(d)?.state)).toEqual([
      "fitted",
      "fitted",
      "fitted",
    ]);
    // A revision bump refits; every draw keeps drawing its old fit meanwhile.
    s.state.k = 4;
    s.spec.revision++;
    const before = draws.map((d) => lattice(s, d));
    expect(s.step(0)).toBe(true);
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false, false]);
    const states = draws.map((d) => s.world.warps.status(d)!.state);
    expect(states.filter((x) => x === "stale")).toHaveLength(2);
    expect(draws.filter((d, i) => lattice(s, d) === before[i])).toHaveLength(2);
    s.step(0);
    s.step(0);
    expect(draws.map((d) => s.world.warps.status(d)!.state)).toEqual([
      "fitted",
      "fitted",
      "fitted",
    ]);
  });

  it("is stepped by the engine's frame: within a budget in the loop, to the end outside it", () => {
    const s = setup();
    const draws = [addQuad(s), addQuad(s), addQuad(s)];
    expect(engine.warpBudgetMs).toBe(4);
    const tick = (
      engine as unknown as { warpTick(budget: number): boolean }
    ).warpTick.bind(engine);
    // The loop's step: one fit at a zero budget, and the loop is kept awake.
    expect(tick(0)).toBe(true);
    expect(draws.filter((d) => hidden(s, d))).toHaveLength(2);
    // A frame outside the loop finishes them before it draws.
    engine.renderFrame();
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false, false]);
    expect(s.world.warps.pending).toBe(0);
    expect(tick(0)).toBe(false);
  });

  it("keeps a user-hidden draw hidden when it is fitted, and shows it when asked", () => {
    const s = setup();
    const draw = addQuad(s);
    s.world.setVisible(draw, false);
    s.step();
    expect(hidden(s, draw)).toBe(true);
    s.world.setVisible(draw, true);
    expect(hidden(s, draw)).toBe(false);
    s.world.setVisible(draw, false);
    expect(hidden(s, draw)).toBe(true);
  });

  it("refits on a revision bump of an unscaled warp, and the twin follows the new map", () => {
    const s = setup();
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    expect(s.fits.count).toBe(2);
    s.state.k = 3;
    s.spec.revision++;
    s.step();
    expect(s.fits.count).toBe(4);
    const mesh = quad();
    for (const draw of draws) {
      const { worst, bound } = twinError(s, draw, mesh);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    }
    // Nothing changed: nothing is refitted.
    s.step();
    expect(s.fits.count).toBe(4);
  });

  it("forgets a draw's fit when it is removed", () => {
    const s = setup();
    const draws = [addQuad(s), addQuad(s), addQuad(s)];
    s.step();
    expect(s.world.warps.cache.size).toBe(3);
    s.world.removeDraw(draws[0]!);
    expect(s.world.warps.cache.size).toBe(2);
    expect(s.world.warps.size).toBe(2);
    draws.slice(1).forEach((d) => s.world.removeDraw(d));
    expect(s.world.warps.cache.size).toBe(0);
    expect(s.world.warps.size).toBe(0);
    // A removed draw's pending fit never runs.
    const late = addQuad(s);
    s.world.removeDraw(late);
    expect(s.world.warps.cache.pending).toBe(0);
  });

  it("leaves a rigid route alone: no fit, no hiding, no terms", () => {
    const s = setup({ rigid: true });
    expect(s.view.anchorRoute(s.earth)).toBeUndefined();
    const draw = addQuad(s);
    s.step();
    expect(hidden(s, draw)).toBe(false);
    expect(drawTerms(s.world, draw)).toBeUndefined();
    expect(s.world.warps.size).toBe(0);
    expect(s.world.warps.cache.size).toBe(0);
    expect(Array.from(s.view.anchorPlacement(s.earth))).toEqual(
      Array.from(m4.mat4()),
    );
  });

  it("finds draws added before the first frame, and holds them", () => {
    const s = setup({ prime: false });
    const draw = addQuad(s);
    expect(hidden(s, draw)).toBe(false);
    s.step(0);
    expect(s.world.warps.status(draw)?.state).toBe("fitted");
    expect(hidden(s, draw)).toBe(false);
    expect(lattice(s, draw)).toBeDefined();
  });

  it("releases its draws when the route becomes rigid, as they were", () => {
    const s = setup();
    const draw = addQuad(s);
    s.world.setPlacement(draw, {
      kind: "dual",
      semantic: PARTNER,
      t: s.world.createPlacementParameter(0.5),
      maxDistance: 2,
    });
    s.step();
    expect(drawTerms(s.world, draw)).toHaveLength(2);
    // The Earth's anchor is bound to the warped frame itself: no warp between.
    s.resolver.bindAnchor(s.earth, s.exaggerated);
    s.step();
    expect(s.view.anchorRoute(s.earth)).toBeUndefined();
    expect(hidden(s, draw)).toBe(false);
    expect(drawTerms(s.world, draw)).toHaveLength(1);
    expect(s.world.drawPlacement(draw)?.kind).toBe("dual");
    expect(s.world.warps.cache.size).toBe(0);
    expect(s.world.warps.size).toBe(0);
  });

  it("keeps an item's own placement, with the route's term after it", () => {
    const s = setup();
    const draw = addQuad(s);
    const t = s.world.createPlacementParameter(0.5);
    s.world.setPlacement(draw, {
      kind: "dual",
      semantic: PARTNER,
      t,
      maxDistance: 2,
    });
    s.step();
    const terms = drawTerms(s.world, draw)!;
    expect(terms.map((x) => x.term.kind)).toEqual(["attribute", "cubic"]);
    expect(s.world.drawPlacement(draw)?.kind).toBe("dual");
    // First-order: the route's term is read at the undeformed position, so
    // the morph's 2 m lift lands within the warp's gradient (≈ 10 × 2 m)
    // of the exact fold; the pure route (t = 0) is exact.
    t.value = 0;
    const { worst, bound } = twinError(s, draw, quad());
    expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    // Setting it again replaces only its own.
    s.world.setPlacement(draw, undefined);
    expect(drawTerms(s.world, draw)).toHaveLength(1);
    expect(s.world.drawPlacement(draw)).toBeUndefined();
    // A draw's own terms leave room for its route's.
    expect(() =>
      s.world.warps.setUser(draw, terms.concat(terms, terms)),
    ).toThrow(/at most 3|room for 2/);
  });

  it("moves a draw's bounds with the warp and pads by the residual, so culling keeps warped tiles", () => {
    const s = setup();
    const draw = addQuad(s, { half: 200 });
    const mesh = quad(200);
    const o = draw.index * RECORD_WORDS + CENTER_WORD;
    const base =
      s.world.raster.recordsF32[draw.index * RECORD_WORDS + RADIUS_WORD]!;
    const home = [0, 1, 2].map((i) => s.world.raster.recordsF32[o + i]!);
    s.step();
    const radius =
      s.world.raster.recordsF32[draw.index * RECORD_WORDS + RADIUS_WORD]!;
    const center = [0, 1, 2].map((i) => s.world.raster.recordsF32[o + i]!);
    // The centre moved by the displacement there (tens of kilometres at
    // k = 10), and the radius grew by the residual alone: the old padding
    // by the whole displacement would be over 20 km. Every displaced vertex
    // is inside the sphere the cull kernel tests.
    const moved = Math.hypot(
      center[0]! - home[0]!,
      center[1]! - home[1]!,
      center[2]! - home[2]!,
    );
    expect(moved).toBeGreaterThan(20_000);
    expect(radius).toBeLessThan(base + 5_000);
    const terms = drawTerms(s.world, draw)!;
    const out = new Float64Array(3);
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const v = [0, 1, 2].map((a) => mesh.positions[i * 3 + a]!);
      placeWithTerms(terms, v, undefined, out);
      expect(
        Math.hypot(
          out[0]! - center[0]!,
          out[1]! - center[1]!,
          out[2]! - center[2]!,
        ),
      ).toBeLessThanOrEqual(radius);
    }
  });

  it("fits within a tile's geometric error: coarser for a larger one", () => {
    const s = setup();
    const origin = Float64Array.of(R + 1000, 0, 0);
    // A 1000 km tile in the tangent plane (model z up the radial).
    // prettier-ignore
    const model = Float64Array.of(
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    );
    const exact = addQuad(s, { half: 500_000, origin, model });
    const loose = addQuad(s, { half: 500_000, origin, model });
    s.world.setDrawGeometricError(loose, 64 * 400);
    s.step();
    const a = lattice(s, exact)!;
    const b = lattice(s, loose)!;
    expect(b.cells).toBeLessThan(a.cells);
    expect(b.errorBound).toBeLessThanOrEqual(400);
    expect(a.errorBound).toBeLessThanOrEqual(b.errorBound + 400);
  }, 60_000);
});

describe("a warp's scale", () => {
  it("is a weight when one scaled warp is followed only by rigid steps: no refit", () => {
    const s = setup({ scaled: "world" });
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    expect(s.fits.count).toBe(2);
    const scale = s.scale!;
    const mesh = quad();
    for (const draw of draws) {
      const w = drawTerms(s.world, draw)!.at(-1)!.weight;
      expect(w.factors).toEqual([{ parameter: scale, offset: 0, slope: 1 }]);
      expect(twinError(s, draw, mesh).worst).toBeLessThanOrEqual(
        twinError(s, draw, mesh).bound + 1e-6,
      );
    }
    const table = s.world.raster.placementTable;
    const write = vi.spyOn(table, "setParameter");
    scale.value = 0.25;
    expect(write).toHaveBeenCalledTimes(1);
    s.step();
    // No refit: the same fits, the weight is the parameter.
    expect(s.fits.count).toBe(2);
    for (const draw of draws) {
      expect(weightOf(drawTerms(s.world, draw)!.at(-1)!.weight)).toBe(0.25);
      const { worst, bound } = twinError(s, draw, mesh);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
      // The map is the quarter-strength warp: p + s (f(p) − p), height × 3.25.
      const at = s.world.drawMatrix(draw)!;
      const p = [at[12]!, at[13]!, at[14]!];
      const q = routeForward(route(s), p);
      const k = 1 + 0.25 * 9;
      const r = Math.hypot(...p);
      expect(Math.hypot(...q)).toBeCloseTo(R + k * (r - R), 4);
    }
    scale.value = 1.5;
    s.step();
    expect(s.fits.count).toBe(2);
    for (const draw of draws) {
      const { worst, bound } = twinError(s, draw, mesh);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    }
  });

  it("refits when the scale is not a weight: a warp follows the scaled one", () => {
    const s = setup({ scaled: "world", second: true });
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    expect(s.fits.count).toBe(2);
    expect(drawTerms(s.world, draws[0]!)!.at(-1)!.weight.factors).toEqual([]);
    s.scale!.value = 0.5;
    s.step();
    expect(s.fits.count).toBe(4);
    const mesh = quad();
    for (const draw of draws) {
      const { worst, bound } = twinError(s, draw, mesh);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    }
    // Unchanged: unrefitted.
    s.step();
    expect(s.fits.count).toBe(4);
  });

  it("refits when the scale is a plain number the GPU cannot read", () => {
    const s = setup({ scaled: "plain" });
    const draw = addQuad(s);
    s.step();
    expect(s.fits.count).toBe(1);
    expect(drawTerms(s.world, draw)!.at(-1)!.weight.factors).toEqual([]);
    s.scale!.value = 0.5;
    s.step();
    expect(s.fits.count).toBe(2);
    const { worst, bound } = twinError(s, draw, quad());
    expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    s.step();
    expect(s.fits.count).toBe(2);
  });
});

describe("the render root", () => {
  /** A rigid child of `parent`, added to the catalog. */
  function child(
    s: Setup,
    name: string,
    parent: Frame,
    x: number,
    y = 0,
    z = 0,
  ): Frame {
    const frame = Frame.constant(name, parent, translation(x, y, z), {
      accuracy: { meters: 0.3, note: "survey" },
    });
    s.catalog.add(frame);
    return frame;
  }

  const rigOn = (s: Setup, frame: Frame): void =>
    engine.cameras.setRig(s.view, {
      position: { frame },
      orientation: { kind: "free" },
    });

  /** Takes the camera off the origin, where the exaggeration is singular and a re-root can't be made. */
  const liftCamera = (s: Setup): void => {
    s.view.camera.position[0] = R + 4000;
    s.view.camera.version++;
  };

  it("keeps its fit when the view re-roots by a rigid step after the warp: nothing refitted, nothing hidden", () => {
    const s = setup();
    liftCamera(s);
    const draw = addQuad(s);
    s.step();
    expect(s.fits.count).toBe(1);
    const before = lattice(s, draw);
    // A frame under `exaggerated`, 1 km up: the route to it is the warp, then a rigid step.
    const mast = child(s, "mast", s.exaggerated, 0, 0, 1000);
    rigOn(s, mast);
    expect(route(s).steps.map((x) => x.kind)).toEqual(["warp", "rigid"]);
    expect(s.step(0)).toBe(false);
    expect(hidden(s, draw)).toBe(false);
    expect(s.fits.count).toBe(1);
    expect(s.world.warps.stats().refits).toBe(0);
    // What follows the last warp is not in the fit: the very same one.
    expect(lattice(s, draw)).toBe(before);
    expect(s.world.warps.status(draw)?.state).toBe("fitted");
    const { worst, bound } = twinError(s, draw, quad());
    expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    // Another rigid root, and back to the first: still nothing.
    rigOn(s, child(s, "tower", s.exaggerated, 50, 60, 70));
    s.step(0);
    rigOn(s, s.exaggerated);
    s.step(0);
    expect(s.fits.count).toBe(1);
    expect(lattice(s, draw)).toBe(before);
    expect(hidden(s, draw)).toBe(false);
  });

  it("reuses a fit when the view returns to a root it had, across an unwarped one", () => {
    const s = setup();
    liftCamera(s);
    const draw = addQuad(s);
    s.step();
    const before = lattice(s, draw);
    expect(s.fits.count).toBe(1);
    // On ITRF the route is rigid: the draw goes back to unwarped.
    rigOn(s, s.itrf);
    s.step(0);
    expect(s.world.warps.has(draw)).toBe(false);
    expect(hidden(s, draw)).toBe(false);
    // Back on the warp frame: drawn at once with the fit it had, none run.
    rigOn(s, s.exaggerated);
    s.step(0);
    expect(hidden(s, draw)).toBe(false);
    expect(s.world.warps.has(draw)).toBe(true);
    expect(s.world.warps.status(draw)?.state).toBe("fitted");
    expect(lattice(s, draw)).toBe(before);
    expect(s.fits.count).toBe(1);
    expect(s.world.warps.pending).toBe(0);
  });

  it("draws a stale fit of an equivalent route, not nothing, for a draw newly under a warp", () => {
    const s = setup();
    liftCamera(s);
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    const before = draws.map((d) => lattice(s, d));
    rigOn(s, s.itrf);
    s.step(0);
    // The warp changes while the draws are unwarped.
    s.state.k = 4;
    s.spec.revision++;
    rigOn(s, s.exaggerated);
    // One fit runs; the other draw shows the fit it had.
    expect(s.step(0)).toBe(true);
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false]);
    const states = draws.map((d) => s.world.warps.status(d)!.state);
    expect(states.filter((x) => x === "stale")).toHaveLength(1);
    expect(draws.filter((d, i) => lattice(s, d) === before[i])).toHaveLength(1);
    s.step(0);
    expect(draws.map((d) => s.world.warps.status(d)!.state)).toEqual([
      "fitted",
      "fitted",
    ]);
    expect(s.fits.count).toBe(4);
  });

  it("holds a draw hidden that has no fit to take up when a re-root puts it under a warp", () => {
    const s = setup();
    liftCamera(s);
    rigOn(s, s.itrf);
    s.step();
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false]);
    rigOn(s, s.exaggerated);
    s.step(0);
    expect(draws.filter((d) => hidden(s, d))).toHaveLength(1);
  });

  it("refits when the route itself changes, drawing the old fit meanwhile, and reuses it on the way back", () => {
    const s = setup({ second: true, prime: false });
    liftCamera(s);
    rigOn(s, s.exaggerated);
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    expect(s.fits.count).toBe(2);
    const before = draws.map((d) => lattice(s, d)!);
    // `flat` is a second warp under `exaggerated`: the route gains a warp.
    rigOn(s, s.rig);
    expect(route(s).steps.map((x) => x.kind)).toEqual(["warp", "warp"]);
    expect(s.step(0)).toBe(true);
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false]);
    expect(
      draws.filter((d) => s.world.warps.status(d)?.state === "stale"),
    ).toHaveLength(1);
    s.step(0);
    expect(s.fits.count).toBe(4);
    expect(draws.map((d) => s.world.warps.status(d)?.state)).toEqual([
      "fitted",
      "fitted",
    ]);
    const mesh = quad();
    draws.forEach((draw, i) => {
      expect(lattice(s, draw)).not.toBe(before[i]);
      const { worst, bound } = twinError(s, draw, mesh);
      expect(worst).toBeLessThanOrEqual(bound + 1e-6);
    });
    // Back to the first route: its fits are still held.
    rigOn(s, s.exaggerated);
    expect(s.step(0)).toBe(false);
    draws.forEach((draw, i) => expect(lattice(s, draw)).toBe(before[i]));
    expect(s.fits.count).toBe(4);
    expect(draws.map((d) => s.world.warps.status(d)?.state)).toEqual([
      "fitted",
      "fitted",
    ]);
  });

  it("refits for a warp's new revision on a re-root, drawing the old fit meanwhile", () => {
    const s = setup();
    liftCamera(s);
    const draws = [addQuad(s), addQuad(s)];
    s.step();
    const before = draws.map((d) => lattice(s, d));
    s.state.k = 4;
    s.spec.revision++;
    rigOn(s, child(s, "mast", s.exaggerated, 0, 0, 1000));
    expect(s.step(0)).toBe(true);
    expect(draws.map((d) => hidden(s, d))).toEqual([false, false]);
    expect(draws.filter((d, i) => lattice(s, d) === before[i])).toHaveLength(1);
    s.step(0);
    expect(s.fits.count).toBe(4);
    expect(draws.map((d) => s.world.warps.status(d)?.state)).toEqual([
      "fitted",
      "fitted",
    ]);
  });

  it("warns once when another view of the world has another root", () => {
    const s = setup();
    addQuad(s);
    const other = engine.addView({
      target: new OffscreenTarget(32, 24),
      world: s.world,
    });
    views.push(other);
    engine.renderFrame();
    engine.renderFrame();
    const warnings = engine.errors.filter((e) =>
      /render root of its first view/.test(e.message),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.count).toBe(1);
  });
});

describe("tiles across a warp", () => {
  function selection(): SelectionView {
    return {
      id: 0,
      position: new Float64Array([R + 4000, 0, 0]),
      direction: new Float64Array([-1, 0, 0]),
      cartographic: { longitude: 0, latitude: 0, height: 4000 },
      planes: new Float64Array(0),
      sseDenominator: 2 * Math.tan(Math.PI / 6),
      height: 4000,
    };
  }

  async function load(s: Setup): Promise<Tileset3D> {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const tileset = await engine.addTileset(s.world, URL_);
    for (let i = 0; i < 100 && tileset.root.state !== "ready"; i++) {
      tileset.update([selection()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tileset.root.state).toBe("ready");
    return tileset;
  }

  it("holds a loaded tile's draws hidden at once, then draws them warped within the tile's error", async () => {
    const s = setup();
    const errors = vi.spyOn(s.world, "setDrawGeometricError");
    const tileset = await load(s);
    try {
      const draws = tileset.root.placement!.draws;
      expect(draws.length).toBeGreaterThan(0);
      // The tile's geometric error reaches the fit's tolerance.
      expect(errors).toHaveBeenCalledWith(draws[0], 640);
      expect(draws.every((d) => hidden(s, d))).toBe(true);
      s.step();
      const mesh: MeshData = {
        positions: Float32Array.of(0, 0, 0, 1, 0, 0, 0, 1, 0),
        indices: Uint32Array.of(0, 1, 2),
      };
      for (const draw of draws) {
        expect(hidden(s, draw)).toBe(false);
        expect(lattice(s, draw)).toBeDefined();
        const matrix = s.world.drawMatrix(draw)!;
        expect(matrix[12]).toBeCloseTo(R + 3000, 3);
        const { worst, bound } = twinErrorOf(s, draw, mesh);
        expect(worst).toBeLessThanOrEqual(bound + 1e-6);
      }
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("reports the route and the fit in the placement query", async () => {
    const s = setup();
    const tileset = await load(s);
    try {
      const draw = tileset.root.placement!.draws[0]!;
      const before = placementOf(s.world, draw, s.view, s.resolver)!;
      expect(before.route?.fit).toBe("pending");
      s.step();
      const info = placementOf(s.world, draw, s.view, s.resolver)!;
      expect(info.route).toEqual({
        warps: [
          {
            description: "height × k",
            presentation: true,
            inverse: false,
          },
        ],
        presentation: true,
        revision: route(s).revision,
        fit: "fitted",
      });
      expect(info.terms).toHaveLength(1);
      expect(info.terms[0]).toMatchObject({ kind: "lattice", weight: 1 });
      expect(info.errorBound).toBeLessThanOrEqual(1e-3 * 1);
      expect(info.estimate).toBe(true);
      expect(info.operation).toMatch(/height × k/);
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("selects a loaded tile on its drawn volume, through the world's map", async () => {
    const s = setup();
    const tileset = await load(s);
    try {
      const select = vi.spyOn(tileset.state.policy, "select");
      tileset.update([selection()]);
      const view = select.mock.calls.at(-1)![2];
      expect(view.warp).toBeDefined();
      const drawn = drawnTile(tileset.root, view.warp!);
      const at = routeForward(route(s), [R + 3000, 0, 0]);
      const sphere = drawn.volume.sphere;
      // 3 km up at k = 10 is drawn 30 km up; the sphere holds that point.
      expect(at[0]).toBeCloseTo(R + 30_000, 3);
      expect(
        Math.hypot(
          sphere.center[0]! - at[0]!,
          sphere.center[1]! - at[1]!,
          sphere.center[2]! - at[2]!,
        ),
      ).toBeLessThanOrEqual(sphere.radius);
      expect(sphere.center[0]!).toBeGreaterThan(R + 20_000);
      expect(drawn.sigmaMax).toBeCloseTo(10, 6);
      // Once its draws are fitted, the fit's error is in the stretched error.
      s.step();
      const again = select.mock.calls.length;
      tileset.update([selection()]);
      expect(select.mock.calls.length).toBeGreaterThan(again);
      expect(drawnTile(tileset.root, view.warp!).fit).toBeGreaterThan(0);
      expect(drawnTile(tileset.root, view.warp!).fit).toBeLessThanOrEqual(
        640 / 64,
      );
    } finally {
      engine.removeTileset(tileset);
    }
  });

  it("selects on the tile's own volume under an anchor placed rigidly", async () => {
    const s = setup({ rigid: true });
    const tileset = await load(s);
    try {
      const select = vi.spyOn(tileset.state.policy, "select");
      tileset.update([selection()]);
      expect(select.mock.calls.at(-1)![2].warp).toBeUndefined();
      expect(s.world.tileWarp(s.earth)).toBeUndefined();
    } finally {
      engine.removeTileset(tileset);
    }
  });
});

describe("a ranged scale", () => {
  it("writes one float and walks no draw, with bounds that hold at every value", () => {
    const s = setup({ scaled: "world", range: [0, 1] });
    const draws = [addQuad(s, { half: 200 }), addQuad(s, { half: 50 })];
    const meshes = [quad(200), quad(50)];
    s.step();
    const bounds = vi.spyOn(s.world.raster.drawConstants, "setBounds");
    const write = vi.spyOn(s.world.raster.placementTable, "setParameter");
    const scale = s.scale!;
    const out = new Float64Array(3);
    for (const v of [0, 0.3, 1, 0.7, 0]) {
      scale.value = v;
      draws.forEach((draw, i) => {
        const o = draw.index * RECORD_WORDS;
        const radius = s.world.raster.recordsF32[o + RADIUS_WORD]!;
        const center = [0, 1, 2].map(
          (a) => s.world.raster.recordsF32[o + CENTER_WORD + a]!,
        );
        const terms = drawTerms(s.world, draw)!;
        const mesh = meshes[i]!;
        for (let k = 0; k < mesh.positions.length / 3; k++) {
          placeWithTerms(
            terms,
            [0, 1, 2].map((a) => mesh.positions[k * 3 + a]!),
            undefined,
            out,
          );
          expect(
            Math.hypot(
              out[0]! - center[0]!,
              out[1]! - center[1]!,
              out[2]! - center[2]!,
            ),
          ).toBeLessThanOrEqual(radius);
        }
      });
    }
    expect(write).toHaveBeenCalledTimes(5);
    expect(bounds).not.toHaveBeenCalled();
    // Out of range: refused, nothing written.
    expect(() => {
      scale.value = 1.5;
    }).toThrow(/outside the parameter's range/);
    expect(write).toHaveBeenCalledTimes(5);
  });

  it("without a range, each change walks the draws that follow the value", () => {
    const s = setup({ scaled: "world" });
    addQuad(s, { half: 200 });
    addQuad(s, { half: 50 });
    s.step();
    const bounds = vi.spyOn(s.world.raster.drawConstants, "setBounds");
    s.scale!.value = 0.5;
    expect(bounds).toHaveBeenCalledTimes(2);
    s.scale!.value = 2;
    expect(bounds).toHaveBeenCalledTimes(4);
  });

  it("keeps selection's drawn volumes over the bucket of a range a value is in, and over a 64th of the unit without one", () => {
    const ranged = setup({ scaled: "world", range: [0, 1] });
    addQuad(ranged);
    ranged.step();
    const before = ranged.world.tileWarp(ranged.earth)!;
    const { version, scaleVersion } = before;
    // From 1 to 0.95: the top sixteenth of the range still.
    ranged.scale!.value = 0.95;
    ranged.step();
    expect(ranged.world.tileWarp(ranged.earth)!.version).toBe(version);
    expect(ranged.world.tileWarp(ranged.earth)!.scaleVersion).toBe(
      scaleVersion,
    );
    // Its image holds the warp at either end of the bucket, no more: not
    // the 13 km the whole range would make it.
    const points = [R + 3000, 0, 0];
    const image = ranged.world.tileWarp(ranged.earth)!.bounds(points);
    expect(image.center[0]!).toBeGreaterThan(R + 3000);
    expect(image.radius).toBeGreaterThan(500);
    expect(image.radius).toBeLessThan(2_000);
    // Another bucket moves the scale, not the map: the volumes are made again
    // from what `bounds` kept, and hold the value there.
    ranged.scale!.value = 0.5;
    ranged.step();
    const moved = ranged.world.tileWarp(ranged.earth)!;
    expect(moved.version).toBe(version);
    expect(moved.scaleVersion!).toBeGreaterThan(scaleVersion!);
    const there = moved.bounds(points);
    const again = moved.rebound!(there.image!);
    expect(Array.from(again.center)).toEqual(Array.from(there.center));
    expect(again.radius).toBe(there.radius);
    expect(there.radius).toBeLessThan(2_000);
    expect(
      Math.abs(there.center[0]! - (R + 3000 * (1 + 0.5 * 9))),
    ).toBeLessThanOrEqual(there.radius);
    // The image of the old bucket, taken again for this one.
    const stale = moved.rebound!(image.image!);
    expect(stale.center[0]!).toBeCloseTo(there.center[0]!, 6);

    const free = setup({ scaled: "world" });
    addQuad(free);
    free.step();
    const start = free.world.tileWarp(free.earth)!.scaleVersion!;
    free.scale!.value = 0.5;
    free.step();
    const crossed = free.world.tileWarp(free.earth)!.scaleVersion!;
    expect(crossed).toBeGreaterThan(start);
    // Within the bucket (1/64) it stays.
    free.scale!.value = 0.5 + 1 / 256;
    free.step();
    expect(free.world.tileWarp(free.earth)!.scaleVersion).toBe(crossed);
  });

  it("remakes the maps for a bucket when the route isn't affine in its scale", () => {
    const s = setup({ scaled: "world", range: [0, 1], second: true });
    addQuad(s);
    s.step();
    const warp = s.world.tileWarp(s.earth)!;
    const version = warp.version;
    s.scale!.value = 0.5;
    s.step();
    expect(s.world.tileWarp(s.earth)!.version).toBeGreaterThan(version);
    expect(s.world.tileWarp(s.earth)!.bounds([R + 3000, 0, 0]).image).toBe(
      undefined,
    );
  });
});

/** `twinError` for a draw whose mesh has no partner attribute. */
function twinErrorOf(s: Setup, draw: DrawHandle, mesh: MeshData) {
  return twinError(s, draw, {
    ...mesh,
    attributes: { [PARTNER]: { data: mesh.positions, components: 3 } },
  });
}

describe("rays through a warp", () => {
  function frames() {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const drawn = warpFrame("drawn", itrf, {
      presentation: true,
      revision: 1,
      forward: (p, out, jacobian) => exaggerate(10, p, out, jacobian),
    });
    const shifted = warpFrame("shifted", itrf, {
      presentation: false,
      revision: 1,
      description: "datum shift",
      forward(p, out, jacobian) {
        out[0] = p[0]! + 100;
        out[1] = p[1]!;
        out[2] = p[2]!;
        jacobian?.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        return out;
      },
    });
    catalog.add(drawn);
    catalog.add(shifted);
    return { catalog, drawn, shifted, resolver: createFramesResolver(catalog) };
  }

  const A = EARTH.ellipsoid.radii[0]!;

  it("refuses a route across a presentation warp, naming the frames", async () => {
    const world = engine.createWorld();
    worlds.push(world);
    const { drawn, resolver } = frames();
    engine.cameras.setResolver(world, resolver);
    await expect(
      engine.queries.castRays({
        anchor: undefined,
        world,
        frame: drawn,
        seconds: 0,
        rays: [{ from: [A + 1000, 0, 0], to: [A - 1000, 0, 0] }],
        targets: [{ kind: "body", body: EARTH }],
      }),
    ).rejects.toThrow(PresentationRouteError);
    await expect(
      engine.queries.castRays({
        anchor: undefined,
        world,
        frame: drawn,
        seconds: 0,
        rays: [{ from: [A + 1000, 0, 0], to: [A - 1000, 0, 0] }],
        targets: [{ kind: "body", body: EARTH }],
      }),
    ).rejects.toThrow(/drawn to Earth.*presentation warp/);
  });

  it("refuses a hit reported in a presentation frame", async () => {
    const world = engine.createWorld();
    worlds.push(world);
    const { drawn, resolver } = frames();
    engine.cameras.setResolver(world, resolver);
    await expect(
      engine.queries.castRays({
        anchor: world.bodyAnchor(EARTH),
        world,
        reportIn: drawn,
        seconds: 0,
        rays: [{ from: [A + 1000, 0, 0], to: [A - 1000, 0, 0] }],
        targets: [{ kind: "body", body: EARTH }],
      }),
    ).rejects.toThrow(/presentation warp/);
  });

  it("carries rays through a warp that is not a presentation, and the hit back", async () => {
    const world = engine.createWorld();
    worlds.push(world);
    const { shifted, resolver } = frames();
    engine.cameras.setResolver(world, resolver);
    const answer = await engine.queries.castRays({
      anchor: undefined,
      world,
      frame: shifted,
      seconds: 0,
      // In the shifted frame the surface at the equator is at x = A + 100.
      rays: [{ from: [A + 1100, 0, 0], to: [A - 900, 0, 0] }],
      targets: [{ kind: "body", body: EARTH }],
    });
    const ray = answer.rays[0]!;
    expect(ray.verdict).toBe("blocked");
    expect(ray.hit!.frame).toBe(shifted);
    expect(ray.hit!.position[0]).toBeCloseTo(A + 100, 6);
    expect(ray.hit!.position[1]).toBeCloseTo(0, 6);
  });
});
