// A rig on GCRF draws what a rig on ITRF draws, and re-rooting changes
// nothing the GPU reads (plan 5a, Task 14; the browser check is
// spikes/rerooting.html). Two worlds, each with a globe and one tileset,
// one view each: one view's rig on GCRF, the other's on ITRF, the same
// pose in the Earth's anchor, the catalog at "analytic" (GCRF's precise
// edge carries IERS eq. 11.19's scale and shear, so it isn't exactly
// ITRF-equivalent). The fake engine of test/fakeGpu.ts; a stubbed `fetch`
// serves tileset.json and `engine.loadGltf` answers with one triangle, as
// in test/earthAnchor.test.ts.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { attachSky } from "../src/frames/attachSky.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import { ViewLayout } from "../src/render/generated/layouts.ts";
import {
  ANCHOR_EYE_WORDS,
  VIEW_ANCHORS_WORD,
  VIEW_BIT_WORD,
  VIEW_STRIDE,
} from "../src/render/layout.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { AnchorHandle, World } from "../src/scene/World.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { Clock } from "../src/time/Clock.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 2, 20, 14, 3, 7, 250);
const BASE = "https://tiles.test/earth/";
const URL_ = `${BASE}tileset.json`;

/** One triangle, one draw, the default material (as test/models.test.ts). */
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

/** A one-tile tileset at the equator and prime meridian. */
const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

/** A camera looking down at Philadelphia from about 1 km up (Earth-fixed). */
function pose(): Camera {
  const camera = new Camera();
  camera.position.set([1_253_000.37, -4_733_000.81, 4_074_000.06]);
  camera.direction.set([-0.19, 0.72, -0.62]);
  camera.orient(Float64Array.of(0, 0, 1));
  return camera;
}

/** Where the clamped points and the terrain clip are (degrees). */
const POINTS = [
  { longitude: -75.16, latitude: 39.95 },
  { longitude: -75.2, latitude: 39.9 },
  { longitude: 0, latitude: 0 },
];
const CLIP = { west: -75.18, south: 39.94, east: -75.15, north: 39.96 };
const DEG = Math.PI / 180;

type Group = [string, number, number];
const word = (field: keyof typeof ViewLayout) => ViewLayout[field] / 4;
/** `n` scalars from `at`, each its own group. */
const scalars = (name: string, at: number, n: number): Group[] =>
  Array.from({ length: n }, (_, i) => [`${name}[${i}]`, at + i, 1]);
/** A column-major 4 × 4 matrix: each column one group. */
const columns = (name: string, at: number): Group[] =>
  Array.from({ length: 4 }, (_, c) => [`${name} column ${c}`, at + c * 4, 4]);

/**
 * The view block's fields before the anchor table, as groups [name, word,
 * words] that each are one vector (a matrix column, a plane's normal, an
 * axis) or one scalar: a step is the float32 step of the group's largest
 * value. A rotated vector's components round by its length's step (a
 * component that is 0 by construction in one reference frame isn't
 * exactly 0 through another), never by another vector's.
 */
const HEADER: Group[] = [
  ...columns("viewProj", word("viewProj")),
  ...columns("viewRotation", word("viewRotation")),
  ["cameraHi", word("cameraHi"), 3],
  ["near", word("near"), 1],
  ["cameraLo", word("cameraLo"), 3],
  ["aspect", word("aspect"), 1],
  ...Array.from({ length: 5 }, (_, k): Group[] => [
    [`plane ${k} normal`, word("planes") + k * 4, 3],
    [`plane ${k} offset`, word("planes") + k * 4 + 3, 1],
  ]).flat(),
  ["sunDirection", word("sunDirection"), 3],
  ["sunDirection.w", word("sunDirection") + 3, 1],
  ...scalars("viewport", word("viewport"), 4),
  ...Array.from({ length: 3 }, (_, k): Group[] => [
    [`iblFrame axis ${k}`, word("iblFrame") + k * 4, 3],
    [`iblFrame.w ${k}`, word("iblFrame") + k * 4 + 3, 1],
  ]).flat(),
  ["sunIlluminance", word("sunIlluminance"), 1],
  ["diffuseIbl", word("diffuseIbl"), 1],
  ["specularIbl", word("specularIbl"), 1],
  ["specularMaxLod", word("specularMaxLod"), 1],
  // viewBit (a word between them) names the view: not compared.
  ["exposure", word("exposure"), 1],
  ["aerialStart", word("aerialStart"), 1],
  ["aerialEnd", word("aerialEnd"), 1],
  ...scalars("sunLight", word("sunLight"), 4),
  ...scalars("bodyRadii", word("bodyRadii"), 4),
  ["moonLight direction", word("moonLight"), 3],
  ["moonLight share", word("moonLight") + 3, 1],
  ...scalars("time", word("time"), 4),
];

/** One anchor slot's fields: [name, word within the slot, words]. */
const SLOT: Group[] = [
  ["eyeHi", 0, 3],
  ["hidden", 3, 1],
  ["eyeLo", 4, 3],
  ["axisX", 8, 3],
  ["axisY", 12, 3],
  ["axisZ", 16, 3],
];

/**
 * The view's sky uniform (Sky.write), as [name, float, floats]: what the
 * sky's passes read of the camera, the sun and the Moon.
 */
const SKY: Group[] = [
  ["camera (km)", 0, 3],
  ["exposure", 3, 1],
  ["sun", 4, 3],
  ["sun disk", 7, 1],
  ["direction", 8, 3],
  ["tan x", 11, 1],
  ["right", 12, 3],
  ["tan y", 15, 1],
  ["up", 16, 3],
  ["sun solid angle", 19, 1],
  ["size", 20, 3],
  ["aerial start", 56, 1],
  ["aerial end", 57, 1],
  ["star exposure", 58, 1],
  ["moon air", 59, 1],
  ["moon direction", 60, 3],
  ["moon radius", 63, 1],
  ["moon meridian", 64, 3],
  ["moon albedo", 67, 1],
  ["moon north", 68, 3],
  ["earthshine", 71, 1],
  ["moon to sun", 72, 3],
  ["city light", 75, 1],
  ["ground scale", 76, 3],
  ["pixel ratio", 79, 1],
];

/** One float32 step (unit in the last place) at `y`: 2^(e − 23), e its exponent. */
function f32Ulp(y: number): number {
  const m = Math.abs(Math.fround(y));
  return m < 2 ** -126 ? 2 ** -149 : 2 ** (Math.floor(Math.log2(m)) - 23);
}

/**
 * The worst difference of `a` from `b` over `groups`, in float32 steps: a
 * step is `f32Ulp` of the group's largest value of `b` (one vector or one
 * scalar, `HEADER`). 0 where they are identical.
 */
function ulps(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  groups: readonly Group[],
  offset = 0,
): { worst: number; field: string } {
  let worst = 0;
  let field = "";
  for (const [name, at, n] of groups) {
    let largest = 0;
    for (let i = 0; i < n; i++) {
      largest = Math.max(largest, Math.abs(b[offset + at + i]!));
    }
    const step = f32Ulp(largest);
    for (let i = 0; i < n; i++) {
      const d = Math.abs(a[offset + at + i]! - b[offset + at + i]!) / step;
      if (d > worst) {
        worst = d;
        field = n > 1 ? `${name}[${i}]` : name;
      }
    }
  }
  return { worst, field };
}

/** The largest absolute difference of two equally long lists of numbers. */
function maxDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  expect(a.length).toBe(b.length);
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
}

interface Internals {
  viewData: Float32Array;
  viewFrames: Map<View, { slot: number; viewBytes: number; sky: object }>;
}

/** One side: a world with a globe and a tileset, and a view whose rig is on `frame`. */
interface Side {
  world: World;
  earth: AnchorHandle;
  view: View;
  globe: Tileset3D;
  tileset: Tileset3D;
  /** Each tileset's selection views at the last render. */
  selected: Map<Tileset3D, SelectionView[]>;
  /** The rays and options of the world's last cast. */
  cast?: { rays: unknown; options: unknown };
  /** The terrain clip rows the world took. */
  clipRows: Float32Array[];
}

let engine: Engine;
const catalog = createFrameCatalog();
const clock = new Clock({ time: T0 });
let detachSky: () => void;
let gcrf: Side;
let itrf: Side;
/** The view's sky uniform at its last Sky.write. */
const skyUniform = new Map<object, Float32Array>();

beforeAll(async () => {
  engine = await fakeEngine();
  vi.spyOn(engine, "loadGltf").mockImplementation(async () => triangle());
  vi.stubGlobal("fetch", async (input: string | URL) =>
    String(input) === URL_
      ? new Response(JSON.stringify(TILESET), {
          headers: { "Content-Type": "application/json" },
        })
      : new Response("not found", { status: 404 }),
  );
  // View.time is the engine's clock (performance.now): held still, so two
  // renders write the same block.
  vi.spyOn(performance, "now").mockReturnValue(1000);
  const sky = engine.sky as unknown as {
    write: (view: object, ...rest: unknown[]) => void;
    f32: Float32Array;
  };
  const write = sky.write.bind(sky);
  vi.spyOn(sky, "write").mockImplementation((view, ...rest) => {
    write(view, ...rest);
    skyUniform.set(view, Float32Array.from(sky.f32));
  });
  detachSky = attachSky(engine, { catalog, clock });
  gcrf = await side("GCRF");
  itrf = await side("ITRF");
});

afterAll(() => {
  detachSky();
  for (const s of [gcrf, itrf]) {
    engine.removeWorld(s.world);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function side(name: "GCRF" | "ITRF"): Promise<Side> {
  const world = engine.createWorld({ maxDraws: 64 });
  const earth = world.bodyAnchor(EARTH);
  world.bodyAnchor(MOON);
  const clipRows: Float32Array[] = [];
  const addRegion = world.addTerrainClipRegion.bind(world);
  vi.spyOn(world, "addTerrainClipRegion").mockImplementation((rows) => {
    clipRows.push(Float32Array.from(rows));
    return addRegion(rows);
  });
  const globe = engine.addEllipsoid(world);
  globe.terrain.addRegion({ rectangle: CLIP });
  const tileset = await engine.addTileset(world, URL_);
  const view = engine.addView({ target: new OffscreenTarget(64, 48), world });
  const s: Side = {
    world,
    earth,
    view,
    globe,
    tileset,
    selected: new Map(),
    clipRows,
  };
  for (const t of [globe, tileset]) {
    vi.spyOn(t, "update").mockImplementation((views) => {
      s.selected.set(
        t,
        views.map((v) => structuredClone(v)),
      );
    });
  }
  vi.spyOn(tileset, "queryRays").mockResolvedValue({
    draws: [],
    release: () => {},
  } as unknown as Awaited<ReturnType<Tileset3D["queryRays"]>>);
  vi.spyOn(world, "castRays").mockImplementation(async (rays, options) => {
    s.cast = { rays: structuredClone(rays), options };
    return rays.map(() => undefined);
  });
  engine.cameras.setResolver(world, createFramesResolver(catalog));
  engine.cameras.setClock(world, clock);
  engine.cameras.setRig(view, {
    position: { frame: catalog.get(name) },
    orientation: { kind: "free" },
  });
  return s;
}

/** Renders every view once; the view's block as written to the staging buffer. */
function blocks(): Map<View, Float32Array> {
  engine.renderFrame();
  const internals = engine as unknown as Internals;
  const out = new Map<View, Float32Array>();
  for (const view of [gcrf.view, itrf.view]) {
    const frame = internals.viewFrames.get(view)!;
    const start = (frame.slot * VIEW_STRIDE) / 4;
    out.set(view, internals.viewData.slice(start, start + frame.viewBytes / 4));
  }
  return out;
}

/** The camera in each anchor of `s`'s view at the pose, and a render. */
function posed(): Map<View, Float32Array> {
  engine.cameras.update();
  for (const s of [gcrf, itrf]) {
    s.view.setCameraFromAnchor(s.earth, pose());
    s.selected.clear();
  }
  return blocks();
}

/** Selection views: lengths within `meters`, unit vectors within 1e-12. */
function selectionDifference(a: SelectionView, b: SelectionView): number {
  expect(a.planes.length).toBe(b.planes.length);
  let worst = Math.max(
    maxDiff(a.position, b.position),
    Math.abs(a.cartographic.height - b.cartographic.height),
    // Longitude and latitude as arcs on the equator's radius.
    Math.abs(a.cartographic.longitude - b.cartographic.longitude) * R,
    Math.abs(a.cartographic.latitude - b.cartographic.latitude) * R,
    Math.abs(a.height - b.height),
  );
  for (let k = 0; k < a.planes.length; k += 4) {
    worst = Math.max(worst, Math.abs(a.planes[k + 3]! - b.planes[k + 3]!));
    expect(
      maxDiff(a.planes.subarray(k, k + 3), b.planes.subarray(k, k + 3)),
    ).toBeLessThanOrEqual(1e-12);
  }
  expect(maxDiff(a.direction, b.direction)).toBeLessThanOrEqual(1e-12);
  expect(a.sseDenominator).toBe(b.sseDenominator);
  return worst;
}

/** The split eye's float64 position. */
const eyeOf = (b: Float32Array, hi: number, lo: number) =>
  [0, 1, 2].map((i) => b[hi + i]! + b[lo + i]!);

describe("a rig on GCRF draws what a rig on ITRF draws (plan 5a, Task 14)", () => {
  it("at three instants a day apart: the view blocks within one float32 step, selection, clamping and clip inputs within 1e-6 m", async () => {
    const measured: Record<string, number> = {};
    const note = (key: string, value: number) => {
      measured[key] = Math.max(measured[key] ?? 0, value);
    };
    for (let k = 0; k < 3; k++) {
      clock.time = T0 + k * DAY;
      const b = posed();
      const g = b.get(gcrf.view)!;
      const i = b.get(itrf.view)!;
      // The rigs place the Earth differently: ITRF at the identity, GCRF
      // turned by the Earth's rotation at the instant.
      const placement = gcrf.view.anchorPlacement(gcrf.earth);
      expect(Math.abs(placement[0]! - 1)).toBeGreaterThan(1e-3);
      expect([...itrf.view.anchorPlacement(itrf.earth)]).toEqual([
        ...m4.mat4(),
      ]);
      // The view blocks: camera, planes, iblFrame, sky inputs.
      expect(g[VIEW_BIT_WORD]).not.toBeUndefined();
      const header = ulps(g, i, HEADER);
      note("header ulps", header.worst);
      expect(header.worst, header.field).toBeLessThanOrEqual(1);
      // The Earth's anchor slot.
      const earthSlot = ulps(
        g,
        i,
        SLOT,
        VIEW_ANCHORS_WORD + gcrf.earth.slot * ANCHOR_EYE_WORDS,
      );
      note("Earth slot ulps", earthSlot.worst);
      expect(earthSlot.worst, earthSlot.field).toBeLessThanOrEqual(1);
      expect(gcrf.earth.slot).toBe(itrf.earth.slot);
      // The sky's own uniform.
      const internals = engine as unknown as Internals;
      const skyG = skyUniform.get(internals.viewFrames.get(gcrf.view)!.sky)!;
      const skyI = skyUniform.get(internals.viewFrames.get(itrf.view)!.sky)!;
      const sky = ulps(skyG, skyI, SKY);
      note("sky uniform ulps", sky.worst);
      expect(sky.worst, sky.field).toBeLessThanOrEqual(1);
      // And the engine's sky inputs, shared, in the Earth's anchor axes:
      // the sun's direction in the block is the engine's.
      for (let c = 0; c < 3; c++) {
        expect(g[ViewLayout.sunDirection / 4 + c]).toBe(
          Math.fround(engine.sunDirection[c]!),
        );
      }

      // Selection views: each tileset's, the globe's and the tileset's.
      for (const t of ["globe", "tileset"] as const) {
        const a = gcrf.selected.get(gcrf[t])!;
        const c = itrf.selected.get(itrf[t])!;
        expect(a).toHaveLength(1);
        expect(c).toHaveLength(1);
        const d = selectionDifference(a[0]!, c[0]!);
        note("selection (m)", d);
        expect(d).toBeLessThanOrEqual(1e-6);
      }

      // Clamping rays (sampleHeightMostDetailed's cast, in the Earth's anchor).
      for (const s of [gcrf, itrf]) {
        s.cast = undefined;
        await engine.sampleHeightMostDetailed(
          s.world,
          POINTS.map((p) => ({
            longitude: p.longitude * DEG,
            latitude: p.latitude * DEG,
          })),
          { tilesets: [s.tileset] },
        );
        expect(s.cast).toBeDefined();
        expect((s.cast!.options as { anchor: AnchorHandle }).anchor).toBe(
          s.earth,
        );
      }
      type Ray = {
        origin: Float64Array;
        direction: Float64Array;
        maxDistance: number;
      };
      const raysG = gcrf.cast!.rays as Ray[];
      const raysI = itrf.cast!.rays as Ray[];
      expect(raysG).toHaveLength(POINTS.length);
      let rays = 0;
      raysG.forEach((r, n) => {
        const o = raysI[n]!;
        rays = Math.max(
          rays,
          maxDiff(r.origin, o.origin),
          Math.abs(r.maxDistance - o.maxDistance),
        );
        expect(maxDiff(r.direction, o.direction)).toBeLessThanOrEqual(1e-12);
      });
      note("clamping rays (m)", rays);
      expect(rays).toBeLessThanOrEqual(1e-6);

      // Terrain-clip inputs: the regions' rows (Earth-fixed), the eye the
      // shader measures fragments from, and the CPU's test.
      expect(gcrf.clipRows).toHaveLength(1);
      const rows = maxDiff(gcrf.clipRows[0]!, itrf.clipRows[0]!);
      const hi = ViewLayout.cameraHi / 4;
      const lo = ViewLayout.cameraLo / 4;
      const eye = maxDiff(eyeOf(g, hi, lo), eyeOf(i, hi, lo));
      note("terrain clip inputs (m)", Math.max(rows, eye));
      expect(rows).toBeLessThanOrEqual(1e-6);
      expect(eye).toBeLessThanOrEqual(1e-6);
      for (const p of [...POINTS, { longitude: -75.165, latitude: 39.95 }]) {
        expect(gcrf.globe.terrainClipped(p.longitude, p.latitude)).toBe(
          itrf.globe.terrainClipped(p.longitude, p.latitude),
        );
      }
      expect(gcrf.globe.terrainClipped(-75.165, 39.95)).toBe(true);
    }
    console.info("[rerooting] GCRF vs ITRF", measured);
  });

  it("re-rooting from ITRF to GCRF and back at a paused instant leaves every float of the view block within one float32 step", () => {
    clock.mode = "paused";
    clock.time = T0 + 0.37 * DAY;
    const view = itrf.view;
    const before = posed().get(view)!;
    engine.cameras.setRig(view, {
      position: { frame: catalog.get("GCRF") },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(catalog.get("GCRF"));
    const rooted = blocks().get(view)!;
    engine.cameras.setRig(view, {
      position: { frame: catalog.get("ITRF") },
      orientation: { kind: "free" },
    });
    expect(engine.cameras.root(view)).toBe(catalog.get("ITRF"));
    const after = blocks().get(view)!;
    expect(after.length).toBe(before.length);
    const slots = (before.length - VIEW_ANCHORS_WORD) / ANCHOR_EYE_WORDS;
    expect(slots).toBe(3);
    const everySlot = Array.from({ length: slots }, (_, s) =>
      SLOT.map(
        ([name, at, n]) =>
          [
            `slot ${s} ${name}`,
            VIEW_ANCHORS_WORD + s * ANCHOR_EYE_WORDS + at,
            n,
          ] as Group,
      ),
    ).flat();
    const all = [
      ...HEADER,
      ["viewBit", VIEW_BIT_WORD, 1] as Group,
      ...everySlot,
    ];
    // Every word of the uploaded block is one of these fields, or padding.
    const covered = new Set<number>();
    for (const [, at, n] of all) {
      for (let w = at; w < at + n; w++) {
        covered.add(w);
      }
    }
    for (let w = 0; w < before.length; w++) {
      if (!covered.has(w)) {
        expect(before[w], `padding word ${w}`).toBe(after[w]);
      }
    }
    const back = ulps(after, before, all);
    console.info(
      `[rerooting] ITRF → GCRF → ITRF: worst ${back.worst} float32 steps${back.field ? ` (${back.field})` : ""}`,
    );
    expect(back.worst, back.field).toBeLessThanOrEqual(1);
    // While on GCRF, what the Earth's content reads is still the same.
    const header = ulps(rooted, before, HEADER);
    const earthSlot = ulps(
      rooted,
      before,
      SLOT,
      VIEW_ANCHORS_WORD + itrf.earth.slot * ANCHOR_EYE_WORDS,
    );
    console.info(
      `[rerooting] ITRF → GCRF: header ${header.worst}, Earth slot ${earthSlot.worst} float32 steps`,
    );
    expect(header.worst, header.field).toBeLessThanOrEqual(1);
    expect(earthSlot.worst, earthSlot.field).toBeLessThanOrEqual(1);
  });
});
