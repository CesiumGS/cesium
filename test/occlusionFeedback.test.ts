// Occlusion feedback to selection (plan Task 12, fix 7), on the CPU: the depth
// pyramid and the box test as the kernels are written, the queries and what
// their results do to a tile, and what `Budgeted` does with it. No GPU.
import { describe, expect, it, vi } from "vitest";
import { Ellipsoid } from "../packages/next/src/math/ellipsoid.ts";
import { Camera } from "../packages/next/src/scene/Camera.ts";
import {
  OcclusionFeedback,
  OcclusionQueries,
  LISTS_PER_VIEW,
} from "../packages/next/src/scene/occlusionFeedback.ts";
import {
  OCCLUSION_BIAS,
  blockOf,
  boxHidden,
  buildPyramid,
  levelSize,
  pyramidShape,
  type PyramidCamera,
} from "../packages/next/src/render/view/occlusionMath.ts";
import { BudgetedSelection } from "../packages/next/src/streaming/Budgeted.ts";
import {
  COARSEN_AFTER_MS,
  COARSEN_BACKOFF_MS,
  COARSEN_RESULTS,
  MAX_QUERIES,
  OCCLUDED_TICKS,
  QUERY_FLOATS,
  RESULT_MAX_AGE,
  type ViewOcclusion,
} from "../packages/next/src/streaming/occlusion.ts";
import {
  StepwiseSelection,
  type SelectionView,
} from "../packages/next/src/streaming/Stepwise.ts";
import {
  treeFromJson,
  type Tile,
} from "../packages/next/src/streaming/Tile.ts";
import type { TileVolume } from "../packages/next/src/streaming/volumes.ts";

describe("the depth pyramid", () => {
  it("is half the frame at level 0, rounded down, with levels to one texel", () => {
    expect(pyramidShape(1920, 1080)).toEqual({
      width: 960,
      height: 540,
      levels: 10,
    });
    expect(pyramidShape(101, 51)).toEqual({ width: 50, height: 25, levels: 6 });
    expect(pyramidShape(1, 1)).toEqual({ width: 1, height: 1, levels: 1 });
    expect(levelSize(pyramidShape(101, 51), 5)).toEqual([1, 1]);
  });

  it("folds an odd edge into the last texel", () => {
    expect(blockOf(0, 5, 2)).toEqual([0, 1]);
    expect(blockOf(1, 5, 2)).toEqual([2, 4]);
    expect(blockOf(1, 4, 2)).toEqual([2, 3]);
    expect(blockOf(0, 1, 1)).toEqual([0, 0]);
  });

  it("holds the farthest depth of each block, and the sky hides everything it touches", () => {
    // 7 × 5 pixels: depth rises with x, and one pixel is sky.
    const depth = (x: number, y: number) =>
      x === 6 && y === 4 ? 0 : 0.1 + x * 0.1 + y * 0.01;
    const levels = buildPyramid(7, 5, depth);
    expect(levels).toHaveLength(2);
    expect(levels[0]).toMatchObject({ width: 3, height: 2 });
    // The last texel across takes pixels 4, 5, 6; the last down, rows 2, 3, 4.
    expect(levels[0]!.texels[0]).toBeCloseTo(0.1, 6);
    expect(levels[0]!.texels[1]).toBeCloseTo(0.3, 6);
    expect(levels[0]!.texels[2]).toBeCloseTo(0.5, 6);
    expect(levels[0]!.texels[5]).toBe(0);
    // Every level's texel is the minimum of what it covers.
    const top = levels[levels.length - 1]!;
    expect(top.texels[0]).toBe(0);
    for (const level of levels) {
      for (const t of level.texels) {
        expect(t).toBeLessThanOrEqual(0.1 + 6 * 0.1 + 4 * 0.01 + 1e-6);
      }
    }
  });

  it("every level's texel is the minimum over the pixels that map to it", () => {
    const w = 37;
    const h = 23;
    let seed = 7;
    const noise = new Float32Array(w * h).map(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    });
    const levels = buildPyramid(w, h, (x, y) => noise[y * w + x]!);
    for (let level = 0; level < levels.length; level++) {
      const { width, height, texels } = levels[level]!;
      const expected = new Float32Array(width * height).fill(Infinity);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const tx = Math.min(x >> (level + 1), width - 1);
          const ty = Math.min(y >> (level + 1), height - 1);
          expected[ty * width + tx] = Math.min(
            expected[ty * width + tx]!,
            noise[y * w + x]!,
          );
        }
      }
      expect(Array.from(texels)).toEqual(Array.from(expected));
    }
  });
});

/** A 640 × 360 frame, 90° across, with a wall: depth 0.5 (2 m away at near 1) over its middle, a floor 100 m back, sky above. */
const FRAME: PyramidCamera = {
  frameWidth: 640,
  frameHeight: 360,
  tanX: 1,
  tanY: 360 / 640,
  near: 1,
};
function wallPyramid() {
  return buildPyramid(640, 360, (x, y) => {
    if (y < 120) {
      return 0; // sky
    }
    if (x >= 220 && x < 420) {
      return 0.5; // the wall, 2 m from the eye
    }
    return 0.01; // 100 m
  });
}
const box = (center: number[], half: number[]) => ({
  center,
  axes: [half[0]!, 0, 0, 0, half[1]!, 0, 0, 0, half[2]!],
});

describe("the box test", () => {
  const levels = wallPyramid();

  it("hides a box behind the wall, and shows one beside it", () => {
    // Straight ahead and below the horizon: the wall's pixels, 50 m behind it.
    expect(boxHidden(levels, FRAME, box([0, -0.4, 50], [2, 0.5, 2]))).toBe(
      true,
    );
    // The same distance, off to the side: the floor shows there.
    expect(boxHidden(levels, FRAME, box([40, -0.4, 50], [2, 0.5, 2]))).toBe(
      false,
    );
  });

  it("shows a box in front of the wall, and one that reaches the wall's edge", () => {
    expect(boxHidden(levels, FRAME, box([0, -0.4, 1.5], [0.2, 0.2, 0.2]))).toBe(
      false,
    );
    // Covers the wall and the floor beside it: some pixels aren't behind the wall.
    expect(boxHidden(levels, FRAME, box([0, -0.4, 50], [30, 0.5, 2]))).toBe(
      false,
    );
  });

  it("shows a box with sky behind any of its pixels", () => {
    // Above the horizon, where the depth is the sky's (0).
    expect(boxHidden(levels, FRAME, box([0, 20, 50], [2, 2, 2]))).toBe(false);
  });

  it("shows a box that reaches the near plane, and one off the screen", () => {
    expect(boxHidden(levels, FRAME, box([0, -0.4, 1.2], [2, 0.5, 2]))).toBe(
      false,
    );
    expect(boxHidden(levels, FRAME, box([500, 0, 50], [2, 2, 2]))).toBe(false);
    expect(boxHidden(levels, FRAME, box([0, -0.4, -50], [2, 0.5, 2]))).toBe(
      false,
    );
  });

  it("keeps a box whose near face lies on the drawn surface", () => {
    // A flat floor at depth 0.01 (100 m): a box on it isn't hidden by itself.
    const floor = buildPyramid(640, 360, () => 0.01);
    expect(boxHidden(floor, FRAME, box([0, -3, 100.5], [20, 0.5, 0.5]))).toBe(
      false,
    );
    // And a wall only a hair nearer than the box's nearest point doesn't hide it either.
    const near = buildPyramid(640, 360, () => 0.01 * (1 + OCCLUSION_BIAS / 2));
    expect(boxHidden(near, FRAME, box([0, -3, 100.5], [20, 0.5, 0.5]))).toBe(
      false,
    );
    const wall = buildPyramid(640, 360, () => 0.012);
    expect(boxHidden(wall, FRAME, box([0, -3, 100.5], [20, 0.5, 0.5]))).toBe(
      true,
    );
  });

  it("tests the corners of a turned box, not its center", () => {
    // A long box turned across the view: its near end sticks out in front of the wall.
    const a = [30, 0, -30, 0, 0.5, 0, 1, 0, 1];
    expect(boxHidden(levels, FRAME, { center: [0, -0.4, 50], axes: a })).toBe(
      false,
    );
  });
});

function build(json: unknown): Tile {
  const tree = {
    warnings: new Set<string>(),
    tilesAdded: () => {},
  } as unknown as Parameters<typeof treeFromJson>[3];
  return treeFromJson(
    { asset: { version: "1.1" }, geometricError: 400, root: json },
    "https://tiles.test/t.json",
    undefined,
    tree,
  ).root;
}

const R = 6_378_137;
const sphereOf = (x: number, y: number, z: number, r: number): TileVolume => ({
  kind: "sphere",
  sphere: { center: Float64Array.of(x, y, z), radius: r },
});

describe("the queries", () => {
  const tile = build({
    geometricError: 0,
    boundingVolume: { sphere: [R, 0, 0, 10] },
    content: { uri: "a.glb" },
  });
  const camera = () => ({
    position: Float64Array.of(R + 1000, 0, 0),
    // Looking down the Earth-fixed y axis, up along x.
    direction: Float64Array.of(0, 1, 0),
    up: Float64Array.of(1, 0, 0),
    right: Float64Array.of(0, 0, -1),
  });

  it("are relative to the eye in float64 and rotated into camera space", () => {
    const list = new OcclusionQueries(0);
    // 1 mm to the right of the camera's axis, 1.5 km ahead and 1 km below: at
    // 6.4 million m from the origin, where a float32 position has half a meter.
    const eye = camera();
    const center = Float64Array.of(R + 0, 1500, -0.001);
    expect(
      list.add(tile, sphereOf(center[0]!, center[1]!, center[2]!, 25), eye),
    ).toBe(true);
    expect(list.count).toBe(1);
    expect(list.tiles[0]).toBe(tile);
    const q = list.data;
    expect(q[0]).toBeCloseTo(0.001, 6);
    expect(q[1]).toBeCloseTo(-1000, 3);
    expect(q[2]).toBeCloseTo(1500, 3);
    // A sphere is the cube around it, aligned to camera space.
    expect(Array.from(q.slice(3, 12))).toEqual([25, 0, 0, 0, 25, 0, 0, 0, 25]);
  });

  it("carry a box's half-axes into camera space", () => {
    const list = new OcclusionQueries(0);
    const obb = {
      kind: "box",
      obb: {
        center: Float64Array.of(R, 100, 0),
        // Half-axes as columns: 5 along x (up), 7 along y (ahead), 9 along z.
        halfAxes: Float64Array.of(5, 0, 0, 0, 7, 0, 0, 0, 9),
      },
      sphere: { center: Float64Array.of(R, 100, 0), radius: 12 },
    } as unknown as TileVolume;
    list.add(tile, obb, camera());
    // x up → camera y; y ahead → camera z; z → camera −x.
    expect(Array.from(list.data.slice(3, 12))).toEqual([
      0, 5, 0, 0, 0, 7, -9, 0, 0,
    ]);
  });

  it("stop at the cap and say so", () => {
    const list = new OcclusionQueries(0);
    let refused = 0;
    for (let i = 0; i < MAX_QUERIES + 5; i++) {
      if (!list.add(tile, sphereOf(R, i, 0, 1), camera())) {
        refused++;
      }
    }
    expect(list.count).toBe(MAX_QUERIES);
    expect(refused).toBe(5);
    expect(list.data.length).toBe(MAX_QUERIES * QUERY_FLOATS);
  });
});

/** A feedback with a list built for one tick, over tiles with ids as their order. */
function tick(
  feedback: OcclusionFeedback,
  tiles: Tile[],
  position = [R, 0, 0],
) {
  feedback.begin(Float64Array.from(position), Float64Array.of(0, 1, 0), 1000);
  const list = feedback.current!;
  for (const t of tiles) {
    list.add(t, sphereOf(R, 0, 0, 1), {
      position: Float64Array.from(position),
      direction: Float64Array.of(0, 1, 0),
      up: Float64Array.of(1, 0, 0),
      right: Float64Array.of(0, 0, -1),
    });
  }
  return feedback.take()!;
}

const bits = (...set: number[]) => {
  const words = new Uint32Array(MAX_QUERIES / 32);
  for (const i of set) {
    words[i >> 5] = (words[i >> 5]! | (1 << (i & 31))) >>> 0;
  }
  return words;
};

describe("what the results do to a tile", () => {
  const tiles = () =>
    [0, 1, 2].map((i) =>
      build({
        geometricError: 0,
        boundingVolume: { sphere: [R, i, 0, 1] },
        content: { uri: `${i}.glb` },
      }),
    );

  it("maps each bit to its tile, and needs two results in a row", () => {
    const feedback = new OcclusionFeedback();
    const [a, b, c] = tiles() as [Tile, Tile, Tile];
    const first = tick(feedback, [a, b, c]);
    feedback.apply(first, bits(0, 2), 0);
    // One result: nothing yet.
    for (const t of [a, b, c]) {
      expect(feedback.occluded(t.viewState(0))).toBe(false);
    }
    expect(a.viewState(0).occludedTicks).toBe(1);
    expect(b.viewState(0).occludedTicks).toBe(0);
    const second = tick(feedback, [a, b, c]);
    feedback.apply(second, bits(0, 1), 0);
    expect(OCCLUDED_TICKS).toBe(2);
    expect(feedback.occluded(a.viewState(0))).toBe(true);
    expect(feedback.occluded(b.viewState(0))).toBe(false);
    expect(feedback.occluded(c.viewState(0))).toBe(false);
  });

  it("clears at once when the tile is seen", () => {
    const feedback = new OcclusionFeedback();
    const [a] = tiles() as [Tile];
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    expect(feedback.occluded(a.viewState(0))).toBe(true);
    feedback.apply(tick(feedback, [a]), bits(), 0);
    expect(a.viewState(0).occludedTicks).toBe(0);
    expect(feedback.occluded(a.viewState(0))).toBe(false);
  });

  it("calls a tile long hidden after seconds of results in a row, and not again soon after it is seen", () => {
    let now = 0;
    const feedback = new OcclusionFeedback(() => now);
    const [a] = tiles() as [Tile];
    const state = a.viewState(0);
    const result = (hidden: boolean) =>
      feedback.apply(tick(feedback, [a]), hidden ? bits(0) : bits(), 0);
    // Hidden for long enough in time, but too few results.
    result(true);
    now += COARSEN_AFTER_MS;
    expect(feedback.longHidden(state)).toBe(false);
    // Enough results, and the time since the first.
    for (let i = 1; i < COARSEN_RESULTS; i++) {
      result(true);
    }
    expect(feedback.occluded(state)).toBe(true);
    expect(feedback.longHidden(state)).toBe(true);
    // Many results in a short time aren't enough: a new run starts when seen.
    result(false);
    expect(feedback.longHidden(state)).toBe(false);
    for (let i = 0; i < COARSEN_RESULTS + 2; i++) {
      result(true);
    }
    expect(feedback.longHidden(state)).toBe(false);
    now += COARSEN_AFTER_MS;
    expect(feedback.longHidden(state)).toBe(true);
    // Coarsened for it (Budgeted marks it), then seen: not again for a while.
    state.coarsenedHidden = true;
    result(false);
    expect(state.coarsenedHidden).toBe(false);
    for (let i = 0; i < COARSEN_RESULTS; i++) {
      result(true);
    }
    now += COARSEN_AFTER_MS;
    expect(feedback.occluded(state)).toBe(true);
    expect(feedback.longHidden(state)).toBe(false);
    now += COARSEN_BACKOFF_MS;
    expect(feedback.longHidden(state)).toBe(true);
  });

  it("says when a refined tile it found hidden may coarsen, for a view that idles until then", () => {
    let now = 1000;
    const feedback = new OcclusionFeedback(() => now);
    const [a, b] = tiles() as [Tile, Tile];
    a.viewState(0).heldRefined = true;
    feedback.apply(tick(feedback, [a, b]), bits(0, 1), 0);
    // Only the refined one can coarsen.
    expect(feedback.coarsenAt).toBe(1000 + COARSEN_AFTER_MS);
    now += COARSEN_AFTER_MS;
    feedback.apply(tick(feedback, [a, b]), bits(0, 1), 0);
    expect(feedback.coarsenAt).toBeUndefined();
  });

  it("keeps views apart", () => {
    const feedback = new OcclusionFeedback();
    const [a] = tiles() as [Tile];
    feedback.apply(tick(feedback, [a]), bits(0), 3);
    feedback.apply(tick(feedback, [a]), bits(0), 3);
    expect(feedback.occluded(a.viewState(3))).toBe(true);
    expect(feedback.occluded(a.viewState(0))).toBe(false);
  });

  it("forgets a tile no result has come for lately", () => {
    const feedback = new OcclusionFeedback();
    const [a] = tiles() as [Tile];
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    expect(feedback.occluded(a.viewState(0))).toBe(true);
    for (let i = 0; i < RESULT_MAX_AGE; i++) {
      feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    }
    expect(feedback.occluded(a.viewState(0))).toBe(true);
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    expect(feedback.occluded(a.viewState(0))).toBe(false);
  });

  it("starts over after a camera cut, and drops a result from before it", () => {
    const feedback = new OcclusionFeedback();
    const [a] = tiles() as [Tile];
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    feedback.apply(tick(feedback, [a]), bits(0), 0);
    expect(feedback.occluded(a.viewState(0))).toBe(true);
    // A result in flight when the camera jumps.
    const late = tick(feedback, [a]);
    // Turned half a radian or more, or moved a quarter of its height.
    const cutPosition = [R, 0, 0];
    feedback.begin(
      Float64Array.from(cutPosition),
      Float64Array.of(1, 0, 0),
      1000,
    );
    expect(feedback.epoch).toBe(1);
    expect(feedback.occluded(a.viewState(0))).toBe(false);
    feedback.apply(late, bits(0), 0);
    expect(feedback.occluded(a.viewState(0))).toBe(false);
    expect(a.viewState(0).occludedTicks).toBe(2); // left as it was, under the old epoch
    expect(late.inFlight).toBe(false);
    // Motion that isn't a jump keeps what is known.
    const b = tiles()[1]!;
    feedback.apply(tick(feedback, [b]), bits(0), 0);
    feedback.begin(
      Float64Array.of(R + 1, 0, 0),
      Float64Array.of(0, 1, 0.01),
      1000,
    );
    expect(feedback.epoch).toBe(2); // the direction turn before it
    feedback.begin(
      Float64Array.of(R + 1, 3, 0),
      Float64Array.of(0, 1, 0.01),
      1000,
    );
    expect(feedback.epoch).toBe(2);
  });

  it("drops a tick when every list is in flight", () => {
    const feedback = new OcclusionFeedback();
    const [a] = tiles() as [Tile];
    const flying = [];
    for (let i = 0; i < LISTS_PER_VIEW; i++) {
      flying.push(tick(feedback, [a]));
    }
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    expect(feedback.current).toBeUndefined();
    expect(feedback.dropped).toBe(1);
    // Queries then go nowhere, and what was known stays.
    const view = feedback.forCamera({
      position: Float64Array.of(R, 0, 0),
      direction: Float64Array.of(0, 1, 0),
      up: Float64Array.of(1, 0, 0),
      right: Float64Array.of(0, 0, -1),
    });
    view.query(a, sphereOf(R, 0, 0, 1));
    feedback.apply(flying[0]!, bits(0), 0);
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    expect(feedback.current).toBeDefined();
    expect(feedback.current!.count).toBe(0);
  });

  it("reuses a list that was built and never drawn", () => {
    const feedback = new OcclusionFeedback();
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    const first = feedback.current;
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    expect(feedback.current).toBe(first);
  });
});

// ------------------------------------------------------------ selection

const HEIGHT = 1080;
const ASPECT = 16 / 9;

function viewAt(
  height: number,
  pitchDeg: number,
  occlusion?: ViewOcclusion,
): SelectionView {
  const camera = new Camera();
  const pitch = (pitchDeg * Math.PI) / 180;
  camera.position.set([R + height, 0, 0]);
  camera.direction.set([Math.sin(pitch), 0, Math.cos(pitch)]);
  camera.orient(Float64Array.of(1, 0, 0));
  camera.version++;
  const planes = new Float64Array(24);
  camera.frustumPlanes(planes, ASPECT, 1);
  for (let k = 0; k < 5; k++) {
    planes[k * 4 + 3] =
      planes[k * 4 + 3]! -
      (planes[k * 4]! * camera.position[0]! +
        planes[k * 4 + 1]! * camera.position[1]! +
        planes[k * 4 + 2]! * camera.position[2]!);
  }
  planes[20] = -camera.direction[0]!;
  planes[21] = -camera.direction[1]!;
  planes[22] = -camera.direction[2]!;
  planes[23] = 5e8 + camera.position[0]! * camera.direction[0]!;
  return {
    id: 0,
    position: camera.position,
    direction: camera.direction,
    cartographic: Ellipsoid.WGS84.cartesianToCartographic(camera.position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    }) ?? { longitude: 0, latitude: 0, height: 0 },
    planes,
    sseDenominator: 2 * Math.tan(camera.fovy(ASPECT) / 2),
    height: HEIGHT,
    pixelRatio: 1,
    ...(occlusion ? { occlusion } : {}),
  } as unknown as SelectionView;
}

const boxJson = (
  y: number,
  z: number,
  half: number,
  error: number,
  uri?: string,
  children?: unknown[],
  refine?: "ADD" | "REPLACE",
) => ({
  geometricError: error,
  ...(refine ? { refine } : {}),
  boundingVolume: { box: [R + 30, y, z, 30, 0, 0, 0, half, 0, 0, 0, half] },
  ...(uri ? { content: { uri } } : {}),
  ...(children ? { children } : {}),
});

/**
 * A tile with content under a coarser one (the top: nothing is above it, so it
 * never counts as occluded), then 4 finer ones, seen from 4 km up: the middle's
 * error is well over the threshold, the finer ones' none.
 */
function pyramidTree(
  middleUri: string | null = "mid.glb",
  refine?: "ADD" | "REPLACE",
) {
  return build(
    boxJson(0, 0, 4000, 800, "top.glb", [
      boxJson(
        0,
        0,
        2000,
        200,
        middleUri ?? undefined,
        [
          boxJson(-1000, -1000, 1000, 0, "a.glb"),
          boxJson(1000, -1000, 1000, 0, "b.glb"),
          boxJson(-1000, 1000, 1000, 0, "c.glb"),
          boxJson(1000, 1000, 1000, 0, "d.glb"),
        ],
        refine,
      ),
    ]),
  );
}

function allTiles(root: Tile, into: Tile[] = []): Tile[] {
  into.push(root);
  for (const child of root.children) {
    allTiles(child, into);
  }
  return into;
}

function occlusionOf(hiddenTiles: Tile[], asked: Tile[] = []): ViewOcclusion {
  return {
    query: (tile) => {
      asked.push(tile);
    },
    // The state belongs to a tile: find it by identity.
    occluded: (state) => hiddenTiles.some((t) => t.viewState(0) === state),
  };
}

const policy = () =>
  new BudgetedSelection({
    dynamicScreenSpaceError: false,
    maximumScreenSpaceError: 16,
  });

describe("selection with occlusion feedback", () => {
  const view = (occlusion?: ViewOcclusion) => viewAt(4000, -85, occlusion);
  const ready = (top: Tile) =>
    allTiles(top).forEach((t) => {
      t.state = "ready";
    });

  it("refines a visible tile, as without the feedback", () => {
    const top = pyramidTree();
    ready(top);
    const plain = policy().select(top, 1600, view());
    expect(plain.selected).toHaveLength(4);
    const asked: Tile[] = [];
    const known = policy().select(top, 1600, view(occlusionOf([], asked)));
    expect(known.selected).toEqual(plain.selected);
    // It asks about the tiles it draws first, then the others it walked.
    expect(asked.slice(0, 4)).toEqual(known.selected);
    expect(asked).toContain(top.children[0]);
    expect(new Set(asked).size).toBe(asked.length);
  });

  it("stops an occluded tile refining, and still draws it", () => {
    const top = pyramidTree();
    ready(top);
    const mid = top.children[0]!;
    const asked: Tile[] = [];
    const result = policy().select(top, 1600, view(occlusionOf([mid], asked)));
    expect(result.selected).toEqual([mid]);
    expect(result.requested).toEqual([]);
    // The finer ones weren't walked, so weren't asked about.
    expect(asked).not.toContain(mid.children[0]);
  });

  it("keeps a refined tile refined while it is hidden briefly, and coarsens it once hidden long", () => {
    const top = pyramidTree();
    ready(top);
    const mid = top.children[0]!;
    const selection = policy();
    // Seen: refined.
    expect(
      selection.select(top, 1600, view(occlusionOf([]))).selected,
    ).toHaveLength(4);
    // Hidden briefly: what it reached stays.
    expect(
      selection.select(top, 1600, view(occlusionOf([mid]))).selected,
    ).toHaveLength(4);
    expect(mid.viewState(0).coarsenedHidden).toBe(false);
    // Hidden long: drawn as itself, and marked for the backoff.
    const long: ViewOcclusion = {
      ...occlusionOf([mid]),
      longHidden: (state) => state === mid.viewState(0),
    };
    expect(selection.select(top, 1600, view(long)).selected).toEqual([mid]);
    expect(mid.viewState(0).coarsenedHidden).toBe(true);
    // Still hidden, but no longer long (the backoff): it stays coarse,
    // since hiding blocks new refinement.
    expect(
      selection.select(top, 1600, view(occlusionOf([mid]))).selected,
    ).toEqual([mid]);
    // Seen again: refined at once.
    expect(
      selection.select(top, 1600, view(occlusionOf([]))).selected,
    ).toHaveLength(4);
  });

  it("never coarsens ADD content for being hidden", () => {
    const top = pyramidTree("mid.glb", "ADD");
    ready(top);
    const mid = top.children[0]!;
    const selection = policy();
    const seen = selection.select(top, 1600, view(occlusionOf([]))).selected;
    const long: ViewOcclusion = {
      ...occlusionOf([mid]),
      longHidden: () => true,
    };
    expect(selection.select(top, 1600, view(long)).selected).toEqual(seen);
  });

  it("treats a tile with no result as visible", () => {
    const top = pyramidTree();
    ready(top);
    expect(
      policy().select(
        top,
        1600,
        view({ query: () => {}, occluded: () => false }),
      ).selected,
    ).toHaveLength(4);
  });

  it("keeps its children's loads in flight, and requests none", () => {
    const top = pyramidTree();
    top.state = "ready";
    const mid = top.children[0]!;
    mid.state = "ready";
    const [a, b, c, d] = mid.children as [Tile, Tile, Tile, Tile];
    a.state = "loading";
    b.state = "loading";
    c.state = "unloaded";
    d.state = "unloaded";
    const result = policy().select(top, 1600, view(occlusionOf([mid])));
    expect(result.selected).toEqual([mid]);
    expect(result.requested).toEqual([]);
    // Touched, so the tileset's cancel-after-a-while leaves them be.
    expect(result.touched).toContain(a);
    expect(result.touched).toContain(b);
    expect(result.touched).not.toContain(c);
  });

  it("requests an occluded tile below every visible request, in the band of view requests", () => {
    const top = pyramidTree();
    top.state = "ready";
    const mid = top.children[0]!;
    mid.state = "ready";
    const [a, b, c, d] = mid.children as [Tile, Tile, Tile, Tile];
    for (const t of [a, b, c, d]) {
      t.state = "unloaded";
    }
    const selection = policy();
    const result = selection.select(top, 1600, view(occlusionOf([c])));
    expect(new Set(result.requested)).toEqual(new Set([a, b, c, d]));
    const priority = result.priority!;
    const slowest = Math.max(
      priority.get(a)!,
      priority.get(b)!,
      priority.get(d)!,
    );
    expect(priority.get(c)!).toBeGreaterThan(slowest);
    expect(selection.purpose(priority.get(c)!)).toBe("view");
    // Without the feedback it asks in its own place.
    const plain = policy().select(top, 1600, view());
    expect(plain.priority!.get(c)!).toBeLessThan(priority.get(c)!);
  });

  it("never stops ADD content: hidden children are requested, after the visible ones", () => {
    const top = pyramidTree("mid.glb", "ADD");
    top.state = "ready";
    const mid = top.children[0]!;
    mid.state = "ready";
    const [a, b, c, d] = mid.children as [Tile, Tile, Tile, Tile];
    for (const t of [a, b, c, d]) {
      t.state = "unloaded";
    }
    // Even with the tile itself hidden, its additive children are walked.
    const result = policy().select(top, 1600, view(occlusionOf([mid, c])));
    expect(new Set(result.requested)).toEqual(new Set([a, b, c, d]));
    const priority = result.priority!;
    const slowest = Math.max(
      priority.get(a)!,
      priority.get(b)!,
      priority.get(d)!,
    );
    expect(priority.get(c)!).toBeGreaterThan(slowest);
    expect(result.selected).toContain(mid);
    // A hidden REPLACE tile's children, by contrast, aren't requested at all.
    const replace = pyramidTree("mid.glb", "REPLACE");
    replace.state = "ready";
    const kept = replace.children[0]!;
    kept.state = "ready";
    kept.children.forEach((t) => {
      t.state = "unloaded";
    });
    expect(
      policy().select(replace, 1600, view(occlusionOf([kept]))).requested,
    ).toEqual([]);
  });

  it("does not gate an empty tile: it has nothing to draw in place of what is below", () => {
    const top = pyramidTree(null);
    ready(top);
    const mid = top.children[0]!;
    const result = policy().select(top, 1600, view(occlusionOf([mid])));
    expect(result.selected).toHaveLength(4);
  });

  it("does not gate where nothing is loaded or requested above it yet", () => {
    const top = pyramidTree();
    allTiles(top).forEach((t) => {
      t.state = "unloaded";
    });
    // The top is the region's base, and loads first, hidden or not.
    const result = policy().select(top, 1600, view(occlusionOf([top])));
    expect(result.requested).toContain(top);
    expect(result.priority!.get(top)!).toBeLessThan(1e11);
  });

  it("leaves Stepwise as 1.x has it", () => {
    const a = pyramidTree();
    const b = pyramidTree();
    ready(a);
    ready(b);
    const asked: Tile[] = [];
    const without = new StepwiseSelection({
      dynamicScreenSpaceError: false,
    }).select(a, 1600, view());
    const withFeedback = new StepwiseSelection({
      dynamicScreenSpaceError: false,
    }).select(b, 1600, view(occlusionOf(allTiles(b), asked)));
    expect(withFeedback.selected.length).toBe(without.selected.length);
    expect(withFeedback.selected.length).toBeGreaterThan(0);
    expect(asked).toEqual([]);
  });
});

describe("what may block", () => {
  // The pass, with a view whose selection asked about one box.
  async function run(opts: {
    view?: "on" | "off";
    engine?: "on" | "off";
    splatted?: boolean;
  }) {
    const { occlusionPass } =
      await import("../packages/next/src/render/view/occlusionPass.ts");
    const feedback = new OcclusionFeedback();
    feedback.begin(Float64Array.of(R, 0, 0), Float64Array.of(0, 1, 0), 1000);
    const tile = build({
      geometricError: 0,
      boundingVolume: { sphere: [R, 0, 0, 1] },
      content: { uri: "a.glb" },
    });
    feedback.current!.add(tile, sphereOf(R, 10, 0, 1), {
      position: Float64Array.of(R, 0, 0),
      direction: Float64Array.of(0, 1, 0),
      up: Float64Array.of(1, 0, 0),
      right: Float64Array.of(0, 0, -1),
    });
    let built = false;
    vi.stubGlobal("GPUTextureUsage", {
      STORAGE_BINDING: 8,
      TEXTURE_BINDING: 4,
      COPY_SRC: 1,
    });
    const view = { occlusionState: feedback, occlusionFeedback: opts.view };
    const frame = { splatted: opts.splatted ?? false, width: 64, height: 48 };
    const camera = {
      position: Float64Array.of(R, 0, 0),
      direction: Float64Array.of(0, 1, 0),
      near: 1,
      fovy: () => 1,
    };
    const engine = {
      occlusionFeedback: opts.engine ?? "on",
      bodyCamera: () => camera,
      ctx: {
        device: {
          createTexture: () => {
            built = true;
            throw new Error("stand-in");
          },
        },
        pipelines: {},
      },
      raster: { occlusionReads: [], timer: { passWrites: () => undefined } },
      scene: { viewIds: new Map() },
    };
    const body = occlusionPass(engine as never, view as never, frame as never, {
      depth: 0 as never,
    });
    try {
      body({} as never, (() => ({})) as never);
    } catch {
      // Reached the GPU calls, which the stand-in doesn't have.
    }
    return !built; // true: the pass left it alone
  }

  it("builds nothing for a view that switches it off, whatever the engine says", async () => {
    expect(await run({ view: "off" })).toBe(true);
    expect(await run({ engine: "off" })).toBe(true);
    // The view's own switch wins over the engine's.
    expect(await run({ engine: "off", view: "on" })).toBe(false);
    expect(await run({ engine: "on" })).toBe(false);
  });

  it("builds no pyramid from a depth that point splats wrote into", async () => {
    // Their depth is written for any pixel they cover, translucent symbols
    // included: that tick asks nothing, and every tile stays unknown (visible).
    expect(await run({ splatted: true })).toBe(true);
  });

  it("leaves translucent draws out of the opaque depth", async () => {
    const { readFileSync } = await import("node:fs");
    const surface = readFileSync(
      "packages/next/src/shaders/surface.slang",
      "utf8",
    );
    // The opaque pass drops a blended material's translucent fragments...
    expect(surface).toMatch(/flags & 8u\) != 0u \? OPAQUE_ALPHA/);
    // ...and a draw blended whole (an opacity under 1, a clip ghost, translucent
    // terrain) is left out of its bundle altogether.
    const bundles = readFileSync(
      "packages/next/src/render/world/bundles.ts",
      "utf8",
    );
    expect(bundles).toMatch(/MaterialFlags\.blendedOnly\) ===/);
  });
});

describe("a still camera reaches a fixed point", () => {
  /** Runs selection tick after tick against a pyramid that always hides `hidden`. */
  function settle(
    top: Tile,
    hidden: Tile[],
    ticks: number,
    seed?: (f: OcclusionFeedback) => void,
  ) {
    const feedback = new OcclusionFeedback();
    seed?.(feedback);
    const eye = {
      position: Float64Array.of(R + 4000, 0, 0),
      direction: Float64Array.of(-1, 0, 0),
      up: Float64Array.of(0, 0, 1),
      right: Float64Array.of(0, 1, 0),
    };
    const selection = policy();
    const drawn: Tile[][] = [];
    const flips: number[] = [];
    for (let t = 0; t < ticks; t++) {
      feedback.begin(eye.position, eye.direction, 4000);
      const sv = viewAt(4000, -85, feedback.forCamera(eye));
      const result = selection.select(top, 1600, sv);
      drawn.push(result.selected);
      const list = feedback.take()!;
      const bits = new Uint32Array(MAX_QUERIES / 32);
      for (let i = 0; i < list.count; i++) {
        if (hidden.includes(list.tiles[i]!)) {
          bits[i >> 5] = (bits[i >> 5]! | (1 << (i & 31))) >>> 0;
        }
      }
      flips.push(feedback.apply(list, bits, 0));
    }
    return { drawn, flips };
  }
  const ready = (top: Tile) =>
    allTiles(top).forEach((t) => {
      t.state = "ready";
    });

  it("keeps the refinement a hidden tile already has, and stops changing", () => {
    const top = pyramidTree();
    ready(top);
    const mid = top.children[0]!;
    const { drawn, flips } = settle(top, [mid], 30);
    // Drawn finely from the first tick, and never coarsened by the verdict.
    for (const set of drawn) {
      expect(set).toHaveLength(4);
      expect(set).not.toContain(mid);
    }
    // The verdict itself settles: no change after the third tick, so no more renders.
    expect(flips.slice(3).every((n) => n === 0)).toBe(true);
  });

  it("keeps a hidden tile unrefined when it hadn't refined", () => {
    const top = pyramidTree();
    ready(top);
    const mid = top.children[0]!;
    const { drawn, flips } = settle(top, [mid], 30, (f) => {
      // Two results already in: hidden before the camera stopped.
      f.tick = 1;
      const state = mid.viewState(0);
      state.occludedTicks = 2;
      state.occludedAt = 1;
    });
    for (const set of drawn) {
      expect(set).toEqual([mid]);
    }
    expect(flips.slice(3).every((n) => n === 0)).toBe(true);
  });

  it("with nothing hidden, selects the same every tick", () => {
    const top = pyramidTree();
    ready(top);
    const { drawn } = settle(top, [], 10);
    expect(
      new Set(drawn.map((s) => s.map((t) => allTiles(top).indexOf(t)).join())),
    ).toHaveProperty("size", 1);
  });
});
