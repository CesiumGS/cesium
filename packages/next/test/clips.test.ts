// Clips (plan §13.26, increment 8a): the shapes and their combination in
// float64, the table the fragment stage reads (a CPU twin of its test, with
// float32 rows), which space each clip is tested in by its frame's route
// (true, drawn, curved), a view's table end to end, and queries filtered by
// clips. The GPU side is spikes/clips.html.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { routeForward } from "../src/camera/route.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import type { Frame } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { warpFrame } from "../src/frames/warpFrame.ts";
import { boxBrep } from "./brepFixtures.ts";
import { brepGeometry } from "../src/geometry/brep.ts";
import { meshGeometry } from "../src/geometry/mesh.ts";
import { writeClips } from "../src/render/view/clipTable.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import {
  CLIP_TABLE_ROWS,
  MAX_CLIP_SETS,
  MAX_CLIP_SET_ROWS,
  MAX_CLIP_SHAPES,
  clipFilter,
  clipSetKeeps,
  clipSetsOf,
  locationFourIsTrue,
  packClipTable,
  planClip,
  shapeContains,
  tableKeeps,
  validateClipSet,
  type ClipSet,
  type ClipShape,
  type PlannedClip,
} from "../src/scene/world/clips.ts";
import type { ViewFrame } from "../src/render/view/viewFrameData.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const R = 6371e3;
const FRAME = { name: "test frame" };

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

/** A deterministic stream in [0, 1). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const PLANE: ClipShape = {
  kind: "plane",
  point: [0, 0, 1],
  normal: [0, 0, 2],
};
const BOX: ClipShape = {
  kind: "box",
  center: [10, 0, 0],
  halfExtents: [1, 2, 3],
};
const L_SHAPE: ClipShape = {
  kind: "polygon",
  ring: [
    [0, 0],
    [4, 0],
    [4, 2],
    [2, 2],
    [2, 4],
    [0, 4],
  ],
  zRange: [-1, 1],
};

describe("shapes", () => {
  it("a plane's inside is behind its normal, whatever its length", () => {
    expect(shapeContains(PLANE, [5, 5, 0.5])).toBe(true);
    expect(shapeContains(PLANE, [5, 5, 1])).toBe(true);
    expect(shapeContains(PLANE, [5, 5, 1.001])).toBe(false);
  });

  it("a box holds its oriented volume", () => {
    expect(shapeContains(BOX, [10.9, 1.9, -2.9])).toBe(true);
    expect(shapeContains(BOX, [11.1, 0, 0])).toBe(false);
    const turned: ClipShape = {
      kind: "box",
      center: [0, 0, 0],
      halfExtents: [5, 1, 1],
      axes: [
        [Math.SQRT1_2, Math.SQRT1_2, 0],
        [-Math.SQRT1_2, Math.SQRT1_2, 0],
        [0, 0, 1],
      ],
    };
    expect(shapeContains(turned, [3, 3, 0])).toBe(true);
    expect(shapeContains(turned, [3, -3, 0])).toBe(false);
  });

  it("a polygon is a prism over its ring, concave included", () => {
    expect(shapeContains(L_SHAPE, [1, 3, 0])).toBe(true);
    expect(shapeContains(L_SHAPE, [3, 1, 0])).toBe(true);
    expect(shapeContains(L_SHAPE, [3, 3, 0])).toBe(false);
    expect(shapeContains(L_SHAPE, [1, 1, 1.5])).toBe(false);
    const unbounded: ClipShape = { kind: "polygon", ring: L_SHAPE.ring };
    expect(shapeContains(unbounded, [1, 1, 1e9])).toBe(true);
  });

  it("combines by union or intersection and keeps inside or outside", () => {
    const set = (extra: Partial<ClipSet>): ClipSet => ({
      frame: FRAME,
      shapes: [PLANE, BOX],
      ...extra,
    });
    const inBoth = [10, 0, 0.5];
    const inPlaneOnly = [0, 0, 0];
    const inBoxOnly = [10, 0, 2.5];
    const neither = [0, 0, 5];
    const keeps = (s: ClipSet) =>
      [inBoth, inPlaneOnly, inBoxOnly, neither].map((p) => clipSetKeeps(s, p));
    expect(keeps(set({}))).toEqual([true, true, true, false]);
    expect(keeps(set({ combine: "intersection" }))).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(keeps(set({ keep: "outside" }))).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(keeps(set({ combine: "intersection", keep: "outside" }))).toEqual([
      false,
      true,
      true,
      true,
    ]);
  });

  it("refuses what the table can't hold, naming it", () => {
    expect(() => validateClipSet({ frame: FRAME, shapes: [] })).toThrow(
      /1 to 16 shapes/,
    );
    expect(() =>
      validateClipSet({
        frame: FRAME,
        shapes: [{ kind: "plane", point: [0, 0, 0], normal: [0, 0, 0] }],
      }),
    ).toThrow(/nonzero/);
    expect(() =>
      validateClipSet({
        frame: FRAME,
        shapes: [
          {
            kind: "polygon",
            ring: [
              [0, 0],
              [1, 1],
            ],
          },
        ],
      }),
    ).toThrow(/3 to 128 vertices/);
    const big = {
      kind: "polygon" as const,
      ring: Array.from(
        { length: 128 },
        (_, i) => [Math.cos(i), Math.sin(i)] as const,
      ),
    };
    expect(() =>
      validateClipSet({
        frame: FRAME,
        shapes: [big, big, big, big, big, big, big, big],
      }),
    ).toThrow(new RegExp(`more than the ${MAX_CLIP_SET_ROWS}`));
    expect(MAX_CLIP_SHAPES).toBe(16);
    expect(CLIP_TABLE_ROWS).toBeGreaterThanOrEqual(
      1 + MAX_CLIP_SETS + MAX_CLIP_SETS * MAX_CLIP_SET_ROWS,
    );
  });
});

/** A random rigid matrix (column-major) and its rotation's columns. */
function rigid(next: () => number, span: number): Float64Array {
  const a = next() * 6;
  const b = next() * 3;
  const c = next() * 6;
  const rz = (t: number) => [
    [Math.cos(t), -Math.sin(t), 0],
    [Math.sin(t), Math.cos(t), 0],
    [0, 0, 1],
  ];
  const rx = (t: number) => [
    [1, 0, 0],
    [0, Math.cos(t), -Math.sin(t)],
    [0, Math.sin(t), Math.cos(t)],
  ];
  const mul = (p: number[][], q: number[][]) =>
    p.map((row) =>
      [0, 1, 2].map(
        (j) => row[0]! * q[0]![j]! + row[1]! * q[1]![j]! + row[2]! * q[2]![j]!,
      ),
    );
  const r = mul(mul(rz(a), rx(b)), rz(c));
  const m = new Float64Array(16);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      m[j * 4 + i] = r[i]![j]!;
    }
    m[12 + i] = (next() - 0.5) * span;
  }
  m[15] = 1;
  return m;
}

describe("the table", () => {
  it("is tested like the sets in float64, camera-relative in float32, far from the origin", () => {
    const next = random(7);
    const sets: ClipSet[] = [
      { frame: FRAME, shapes: [PLANE, BOX], combine: "union", keep: "inside" },
      {
        frame: FRAME,
        shapes: [
          L_SHAPE,
          { kind: "plane", point: [1, 1, 0], normal: [1, 0, 0] },
        ],
        combine: "intersection",
        keep: "outside",
      },
      {
        frame: FRAME,
        shapes: [
          {
            kind: "box",
            center: [2, 2, 0],
            halfExtents: [3, 3, 3],
            axes: [
              [Math.SQRT1_2, Math.SQRT1_2, 0],
              [-Math.SQRT1_2, Math.SQRT1_2, 0],
              [0, 0, 1],
            ],
          },
        ],
        keep: "outside",
      },
    ];
    // Far from the origin, as ITRF content is: the table is camera-relative.
    const matrix = rigid(next, 20);
    matrix[12] = matrix[12]! + R;
    matrix[13] = matrix[13]! + 1e5;
    matrix[14] = matrix[14]! + 3e6;
    const camera = [matrix[12]! + 3, matrix[13]! - 4, matrix[14]! + 2];
    const plans: PlannedClip[] = sets.map((set, i) => ({
      set,
      space: i === 1 ? "drawn" : "true",
      matrix,
    }));
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    const bytes = packClipTable(plans, camera, table);
    expect(bytes).toBeLessThanOrEqual(CLIP_TABLE_ROWS * 16);
    const inverse = invert(matrix);
    let kept = 0;
    let agree = 0;
    for (let n = 0; n < 4000; n++) {
      // A point in the set's frame, camera-relative in the shading axes.
      const local = [
        (next() - 0.5) * 24,
        (next() - 0.5) * 24,
        (next() - 0.5) * 6,
      ];
      const world = apply(matrix, local);
      const rel = [
        world[0]! - camera[0]!,
        world[1]! - camera[1]!,
        world[2]! - camera[2]!,
      ];
      // The same point for each space: the drawn one is the true one here.
      const gpu = tableKeeps(table, { true: rel, drawn: rel });
      const cpu = sets.every((s) => clipSetKeeps(s, apply(inverse, world)));
      // Float32 rows: a point within a millimetre of a face may differ.
      if (gpu === cpu) {
        agree++;
      } else {
        expect(nearBoundary(sets, apply(inverse, world), 2e-3)).toBe(true);
      }
      kept += cpu ? 1 : 0;
    }
    expect(agree).toBeGreaterThan(3990);
    expect(kept).toBeGreaterThan(100);
    expect(kept).toBeLessThan(3900);
  });

  it("tests each set on its own point, true or drawn", () => {
    const set = (space: "true" | "drawn"): PlannedClip => ({
      set: { frame: FRAME, shapes: [PLANE] },
      space,
      matrix: Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
    });
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    packClipTable([set("true")], [0, 0, 0], table);
    const below = [0, 0, 0.5];
    const above = [0, 0, 5];
    expect(tableKeeps(table, { true: below, drawn: above })).toBe(true);
    expect(tableKeeps(table, { true: above, drawn: below })).toBe(false);
    packClipTable([set("drawn")], [0, 0, 0], table);
    expect(tableKeeps(table, { true: below, drawn: above })).toBe(false);
    expect(tableKeeps(table, { true: above, drawn: below })).toBe(true);
    // The header says some set is drawn, so the fragment stage rebuilds the point.
    expect(new Uint32Array(table.buffer)[1]).toBe(1);
    packClipTable([set("true")], [0, 0, 0], table);
    expect(new Uint32Array(table.buffer)[1]).toBe(0);
  });

  it("holds at most eight sets", () => {
    const plan: PlannedClip = {
      set: { frame: FRAME, shapes: [PLANE] },
      space: "true",
      matrix: Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
    };
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    expect(() => packClipTable(Array(9).fill(plan), [0, 0, 0], table)).toThrow(
      /at most 8/,
    );
  });
});

function apply(m: ArrayLike<number>, p: ArrayLike<number>): number[] {
  return [0, 1, 2].map(
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );
}

function invert(m: ArrayLike<number>): number[] {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[c * 4 + r] = m[r * 4 + c]!;
    }
  }
  for (let r = 0; r < 3; r++) {
    out[12 + r] = -(
      out[r]! * m[12]! +
      out[4 + r]! * m[13]! +
      out[8 + r]! * m[14]!
    );
  }
  out[15] = 1;
  return out;
}

/** Whether a point is within `tolerance` of a shape's boundary, by sampling its neighbours. */
function nearBoundary(
  sets: readonly ClipSet[],
  p: number[],
  tolerance: number,
): boolean {
  const here = sets.map((s) => s.shapes.map((sh) => shapeContains(sh, p)));
  for (let i = 0; i < 26; i++) {
    const d = [(i % 3) - 1, (Math.floor(i / 3) % 3) - 1, Math.floor(i / 9) - 1];
    const q = [
      p[0]! + d[0]! * tolerance,
      p[1]! + d[1]! * tolerance,
      p[2]! + d[2]! * tolerance,
    ];
    if (
      sets.some((s, k) =>
        s.shapes.some((sh, j) => shapeContains(sh, q) !== here[k]![j]),
      )
    ) {
      return true;
    }
  }
  return false;
}

describe("which space a clip is tested in", () => {
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

  /** A world whose view's rig sits on `rig(catalog)`, over ITRF. */
  function scene(build: (itrf: Frame) => { frames: Frame[]; rig: Frame }) {
    const world = engine.createWorld({ maxDraws: 8 });
    worlds.push(world);
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const { frames, rig } = build(itrf);
    for (const f of frames) {
      catalog.add(f);
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
    view.camera.position.set([0, 0, R + 30]);
    view.camera.version++;
    engine.cameras.update();
    const placement = () => ({
      resolver,
      seconds: 0,
      root: engine.cameras.root(view),
      body: earth,
      bodyPlacement: view.anchorPlacement(earth),
      bodyRoute: view.anchorRoute(earth),
    });
    return { world, view, earth, itrf, resolver, catalog, placement, frames };
  }

  const planeIn = (frame: Frame): ClipSet => ({
    frame,
    shapes: [{ kind: "plane", point: [0, 0, R + 1], normal: [0, 0, 1] }],
  });

  it("no warp: ITRF content and a clip in ITRF are tested on the true point", () => {
    const s = scene((itrf) => ({ frames: [], rig: itrf }));
    const plan = planClip(planeIn(s.itrf), s.placement()) as PlannedClip;
    expect(plan.space).toBe("true");
    expect(Array.from(plan.matrix)).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  });

  it("under a presentation warp: a clip in ITRF is true, one in the drawn frame is drawn", () => {
    const s = scene((itrf) => {
      const exaggerated = warpFrame("exaggerated", itrf, {
        presentation: true,
        revision: 1,
        forward: (p, out, j) => exaggerate(10, p, out, j),
      });
      return { frames: [exaggerated], rig: exaggerated };
    });
    const exaggerated = s.frames[0]!;
    expect(locationFourIsTrue(s.view.anchorRoute(s.earth))).toBe(true);
    const inTrue = planClip(planeIn(s.itrf), s.placement()) as PlannedClip;
    expect(inTrue.space).toBe("true");
    const inDrawn = planClip(
      planeIn(exaggerated),
      s.placement(),
    ) as PlannedClip;
    expect(inDrawn.space).toBe("drawn");
    // The drawn plane's frame is the render root: the shading axes' placement undone.
    expect(inDrawn.matrix[12]).toBeCloseTo(0, 6);
    expect(inDrawn.matrix[0]).toBeCloseTo(1, 12);
  });

  it("under a reprojection the drawn point is the true one: a clip in the root frame is drawn, one in ITRF is curved", () => {
    const s = scene((itrf) => {
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
      return { frames: [shifted], rig: shifted };
    });
    const shifted = s.frames[0]!;
    expect(locationFourIsTrue(s.view.anchorRoute(s.earth))).toBe(false);
    expect(
      (planClip(planeIn(shifted), s.placement()) as PlannedClip).space,
    ).toBe("drawn");
    const curved = planClip(planeIn(s.itrf), s.placement());
    expect("curved" in curved && curved.curved).toMatch(/curved surface/);
  });

  it("a view's table end to end: each set in its space, against float64 on the route", () => {
    const s = scene((itrf) => {
      const exaggerated = warpFrame("exaggerated", itrf, {
        presentation: true,
        revision: 1,
        forward: (p, out, j) => exaggerate(10, p, out, j),
      });
      return { frames: [exaggerated], rig: exaggerated };
    });
    const exaggerated = s.frames[0]!;
    const trueSet: ClipSet = {
      frame: s.itrf,
      shapes: [{ kind: "plane", point: [0, 0, R + 1], normal: [0, 0, 1] }],
    };
    const drawnSet: ClipSet = {
      frame: exaggerated,
      shapes: [
        { kind: "box", center: [0, 0, R + 5], halfExtents: [50, 50, 4] },
      ],
      keep: "outside",
    };
    const a = s.world.addClip(trueSet);
    const b = s.world.addClip(drawnSet);
    s.view.setClips([a, b]);
    expect(s.view.clipMask).toBe(a.bit | b.bit);
    const frame = {
      clipBuffer: undefined,
      clipBytes: 0,
    } as unknown as ViewFrame;
    writeClips(engine, s.view, frame);
    expect(frame.clipBytes).toBeGreaterThan(0);
    const table = new Float32Array(CLIP_TABLE_ROWS * 4);
    // Read back what was packed: pack again with the same plans.
    const plans = s.view
      .clipSets()
      .map((set) => planClip(set, s.placement()) as PlannedClip);
    expect(plans.map((p) => p.space)).toEqual(["true", "drawn"]);
    const camera = engine.bodyCamera(s.view).position;
    packClipTable(plans, camera, table);
    // True point: ITRF, a true height; drawn point: the route's image of it.
    const route = s.resolver.route!(s.itrf, exaggerated, 0);
    const next = random(3);
    let checked = 0;
    for (let n = 0; n < 500; n++) {
      const truth = [
        (next() - 0.5) * 100,
        (next() - 0.5) * 100,
        R + next() * 3,
      ];
      const drawn = Array.from(routeForward(route, truth));
      const rel = (p: ArrayLike<number>) =>
        [0, 1, 2].map((i) => p[i]! - camera[i]!);
      const gpu = tableKeeps(table, { true: rel(truth), drawn: rel(drawn) });
      const cpu = clipSetKeeps(trueSet, truth) && clipSetKeeps(drawnSet, drawn);
      const margin = Math.min(Math.abs(truth[2]! - (R + 1)), 1e9);
      if (margin > 1e-3) {
        expect(gpu).toBe(cpu);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it("a view's mask names the world's clips, and a removed clip no longer cuts", () => {
    const s = scene((itrf) => ({ frames: [], rig: itrf }));
    const a = s.world.addClip(planeIn(s.itrf));
    const b = s.world.addClip(planeIn(s.itrf));
    expect(a.bit).toBe(1);
    expect(b.bit).toBe(2);
    s.view.clipMask = a.bit | b.bit;
    expect(s.view.clipSets()).toHaveLength(2);
    s.world.removeClip(a);
    expect(s.view.clipSets()).toHaveLength(1);
    expect(s.world.clipOf(a)).toBeUndefined();
    expect(() => s.world.removeClip(a)).toThrow(/not .* in this world/);
    // A freed bit is the next clip's.
    expect(s.world.addClip(planeIn(s.itrf)).bit).toBe(1);
    expect(() => {
      s.view.clipMask = -1;
    }).toThrow(RangeError);
    const revision = s.world.clipsRevision;
    s.world.setClip(b, { ...planeIn(s.itrf), keep: "outside" });
    expect(s.world.clipsRevision).toBe(revision + 1);
    expect(s.world.clipOf(b)!.keep).toBe("outside");
    expect(() => s.world.addClip({ frame: s.itrf, shapes: [] })).toThrow(
      RangeError,
    );
  });

  it("the engine's filter: the view's clips for picks, none for world questions, a set of its own", () => {
    const s = scene((itrf) => ({ frames: [], rig: itrf }));
    const clip = s.world.addClip(planeIn(s.itrf));
    // No clips on the view yet: nothing to test.
    expect(engine.clipFilter(s.view)).toBeUndefined();
    s.view.setClips([clip]);
    const viewFilter = engine.clipFilter(s.view)!;
    // In the Earth's anchor (bound to ITRF): the plane is 1 m above the pole.
    expect(viewFilter.keeps([0, 0, R + 0.5])).toBe(true);
    expect(viewFilter.keeps([0, 0, R + 2])).toBe(false);
    expect(engine.clipFilter(s.view, { clips: "none" })).toBeUndefined();
    const own = engine.clipFilter(s.view, {
      clips: { ...planeIn(s.itrf), keep: "outside" },
    })!;
    expect(own.keeps([0, 0, R + 2])).toBe(true);
  });

  it("a view without clips writes no table", () => {
    const s = scene((itrf) => ({ frames: [], rig: itrf }));
    const frame = {
      clipBuffer: undefined,
      clipBytes: 7,
    } as unknown as ViewFrame;
    writeClips(engine, s.view, frame);
    expect(frame.clipBytes).toBe(0);
    expect(frame.clipBuffer).toBeUndefined();
  });
});

describe("queries", () => {
  // A 10 m square roof at z = 5 over a 10 m square floor at z = 0.
  const slab = (z: number) => [
    [0, 0, z],
    [10, 0, z],
    [10, 10, z],
    [0, 10, z],
  ];
  const mesh = meshGeometry({
    positions: Float32Array.from([...slab(5), ...slab(0)].flat()),
    indices: Uint32Array.of(0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6),
  });
  // Keeps what is below z = 3.
  const below: ClipSet = {
    frame: FRAME,
    shapes: [{ kind: "plane", point: [0, 0, 3], normal: [0, 0, 1] }],
  };
  const filter = clipFilter([below])!;
  const down = { from: [5, 5, 9], to: [5, 5, -1] };

  it("a ray passes through what the clips remove and hits what is behind", () => {
    const plain = mesh.rayHit(down);
    expect(plain.verdict === "hit" && plain.hit.position[2]).toBeCloseTo(5, 9);
    const clipped = mesh.rayHit(down, { clips: filter });
    expect(clipped.verdict).toBe("hit");
    if (clipped.verdict === "hit") {
      expect(clipped.hit.position[2]).toBeCloseTo(0, 9);
      expect(clipped.hit.t).toBeCloseTo(0.9, 9);
    }
    // Nothing is kept above: a ray that only meets the roof misses.
    expect(
      mesh.rayHit({ from: [5, 5, 9], to: [5, 5, 4] }, { clips: filter })
        .verdict,
    ).toBe("miss");
    expect(mesh.rayHit(down, { clips: filter, anyHit: true }).verdict).toBe(
      "hit",
    );
  });

  it("the nearest point is the nearest kept one", () => {
    const plain = mesh.closestPoint([5, 5, 6])!;
    expect(plain.distance).toBeCloseTo(1, 9);
    const clipped = mesh.closestPoint([5, 5, 6], { clips: filter })!;
    expect(clipped.position[2]).toBeCloseTo(0, 9);
    expect(clipped.distance).toBeCloseTo(6, 9);
    expect(clipped.accuracy.exact).toBe(true);
    // A face cut in part: the nearest kept part of a tilted sheet, found by division.
    const sheet = meshGeometry({
      positions: Float32Array.of(0, 0, 0, 8, 0, 8, 0, 8, 0),
      indices: Uint32Array.of(0, 1, 2),
    });
    const cut = sheet.closestPoint([4, 4, 12], { clips: filter })!;
    expect(cut.position[2]).toBeLessThanOrEqual(3 + 1e-6);
    expect(cut.accuracy.exact).toBe(false);
    expect(cut.accuracy.meters).toBeGreaterThan(0);
    expect(cut.accuracy.note).toMatch(/clipped/);
  });

  it("a segment's distance counts only what is kept", () => {
    const seg = { from: [20, 5, 5], to: [20, 5, 5.5] };
    expect(mesh.segmentDistance(seg.from, seg.to).distance).toBeCloseTo(10, 9);
    const clipped = mesh.segmentDistance(seg.from, seg.to, { clips: filter });
    expect(clipped.distance).toBeGreaterThan(10);
    // The floor's nearest edge is at x = 10, 5 m below the segment's low end.
    expect(clipped.distance).toBeCloseTo(Math.hypot(10, 5), 6);
  });

  it("a b-rep's ray goes on behind a removed face", () => {
    const box = brepGeometry(boxBrep());
    const topDown = { from: [1, 1.5, 10], to: [1, 1.5, -10] };
    const plain = box.rayHit(topDown);
    expect(plain.verdict === "hit" && plain.hit.position[2]).toBeCloseTo(4, 9);
    const keepBelow = clipFilter([
      {
        frame: FRAME,
        shapes: [{ kind: "plane", point: [0, 0, 3], normal: [0, 0, 1] }],
      },
    ])!;
    const clipped = box.rayHit(topDown, { clips: keepBelow });
    expect(clipped.verdict === "hit" && clipped.hit.position[2]).toBeCloseTo(
      0,
      9,
    );
    // Its nearest point is on the kept side; the answer says what it can't promise.
    const near = box.closestPoint([1, 1.5, 9], { clips: keepBelow })!;
    expect(near.position[2]).toBeLessThanOrEqual(3 + 1e-9);
    expect(near.accuracy.exact).toBe(false);
  });

  it("`clips` picks the sets a query applies", () => {
    const view = [below];
    expect(clipSetsOf(undefined, view, "view")).toBe(view);
    expect(clipSetsOf(undefined, view, "none")).toEqual([]);
    expect(clipSetsOf("none", view, "view")).toEqual([]);
    expect(clipSetsOf("view", view, "none")).toBe(view);
    expect(clipSetsOf(below, view, "none")).toEqual([below]);
    expect(clipFilter([])).toBeUndefined();
  });

  it("points are routed into each set's own frame, in float64", () => {
    const catalog = createFrameCatalog({ data: syntheticFrameData() });
    const itrf = catalog.get("ITRF");
    const drawn = warpFrame("drawn", itrf, {
      presentation: true,
      revision: 1,
      forward: (p, out, j) => exaggerate(10, p, out, j),
    });
    catalog.add(drawn);
    const resolver = createFramesResolver(catalog);
    // A plane 5 m up in the drawn frame is 0.5 m up in true height.
    const drawnSet: ClipSet = {
      frame: drawn,
      shapes: [{ kind: "plane", point: [0, 0, R + 5], normal: [0, 0, 1] }],
    };
    const f = clipFilter([drawnSet], { resolver, frame: itrf, seconds: 0 })!;
    expect(f.keeps([0, 0, R + 0.4])).toBe(true);
    expect(f.keeps([0, 0, R + 0.6])).toBe(false);
    const trueSet: ClipSet = { ...drawnSet, frame: itrf };
    const g = clipFilter([trueSet], { resolver, frame: itrf, seconds: 0 })!;
    expect(g.keeps([0, 0, R + 4])).toBe(true);
  });
});
