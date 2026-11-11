// The parts of selection that run on drawn volumes under a warped anchor
// besides distance, frustum and error (plan §13.26, increment 3): the shadow
// casters' reach, the viewer's request volume and the dynamic screen-space
// error's root volume. A fake `TileWarp` moves each tile by a translation, so
// what is drawn is far from where the volume says; with no warp, selection is
// as it was.
import { describe, expect, it } from "vitest";
import { Camera } from "../src/scene/Camera.ts";
import { BudgetedSelection } from "../src/streaming/Budgeted.ts";
import {
  StepwiseSelection,
  type CasterRoom,
  type SelectionView,
} from "../src/streaming/Stepwise.ts";
import { treeFromJson, type Tile } from "../src/streaming/Tile.ts";
import {
  drawnRequestVolume,
  type TileWarp,
} from "../src/streaming/tileWarp.ts";

const R = 6_378_137;
const ASPECT = 16 / 9;

/** Moves a tile by `shift(its centre's y)`, whole: a map with σ = 1, and the image's bounding sphere. */
function shiftWarp(shift: (y: number) => number[]): TileWarp & {
  version: number;
} {
  return {
    version: 1,
    fitVersion: 0,
    bounds(points) {
      const n = points.length / 3;
      const mean = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        for (let a = 0; a < 3; a++) {
          mean[a] = mean[a]! + points[i * 3 + a]! / n;
        }
      }
      const s = shift(Math.round(mean[1]!));
      const center = Float64Array.of(
        mean[0]! + s[0]!,
        mean[1]! + s[1]!,
        mean[2]! + s[2]!,
      );
      let radius = 0;
      for (let i = 0; i < n; i++) {
        radius = Math.max(
          radius,
          Math.hypot(
            points[i * 3]! + s[0]! - center[0]!,
            points[i * 3 + 1]! + s[1]! - center[1]!,
            points[i * 3 + 2]! + s[2]! - center[2]!,
          ),
        );
      }
      return {
        center,
        radius,
        sigmaMin: 1,
        sigmaMax: 1,
        secondDerivative: 0,
      };
    },
    fitError: () => 0,
  };
}

type Box = number[];

interface Json {
  geometricError: number;
  refine?: "ADD" | "REPLACE";
  boundingVolume: { box: Box };
  viewerRequestVolume?: { box: Box };
  content?: { uri: string; boundingVolume?: { box: Box } };
  children?: Json[];
}

/** A box `up` m above the sphere's surface at longitude 0, `east` m along it and `north` m, half-size `h`. */
const boxAt = (up: number, east: number, north: number, h: number): Box => [
  R + up,
  east,
  north,
  h,
  0,
  0,
  0,
  h,
  0,
  0,
  0,
  h,
];

function tile(json: Json): Tile {
  const tree = {
    warnings: new Set<string>(),
    tilesAdded: () => {},
  } as unknown as Parameters<typeof treeFromJson>[3];
  const root = treeFromJson(
    { asset: { version: "1.1" }, geometricError: 100, root: json },
    "https://tiles.test/t.json",
    undefined,
    tree,
  ).root;
  if (root.renderable) {
    root.state = "ready";
    root.bytes = 1000;
  }
  return root;
}

/** A camera `height` m up at longitude 0, latitude 0, looking along `direction`. */
function viewAt(
  height: number,
  direction: number[],
  warp?: TileWarp,
): SelectionView {
  const camera = new Camera();
  camera.position.set([R + height, 0, 0]);
  camera.direction.set(direction);
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
  planes[23] =
    5e8 +
    camera.position[0]! * camera.direction[0]! +
    camera.position[1]! * camera.direction[1]! +
    camera.position[2]! * camera.direction[2]!;
  return {
    id: 0,
    position: camera.position,
    direction: camera.direction,
    cartographic: { longitude: 0, latitude: 0, height },
    planes,
    sseDenominator: 2 * Math.tan(camera.fovy(ASPECT) / 2),
    height: 1080,
    pixelRatio: 1,
    ...(warp && { warp }),
  };
}

/** One cascade box, as `casterPlanes` makes them: six planes with inward normals, the fifth toward the light (straight up). */
function cascadeBox(
  center: readonly number[],
  half: readonly number[],
): Float64Array {
  const planes: number[] = [];
  const axes: Array<[number[], number]> = [
    [[0, 1, 0], 1],
    [[0, -1, 0], 1],
    [[0, 0, 1], 1],
    [[0, 0, -1], 1],
    [[1, 0, 0], 1],
    [[-1, 0, 0], 1],
  ];
  for (const [n] of axes) {
    const a = n.findIndex((x) => x !== 0);
    const sign = n[a]!;
    // n·p + d ≥ 0 inside: d = half − sign·center along the axis.
    planes.push(...n, half[a]! - sign * center[a]!);
  }
  return Float64Array.from(planes);
}

const room = (receivers: CasterRoom["receivers"]): CasterRoom => ({
  bytes: Infinity,
  load: true,
  estimate: 1,
  pressure: 0,
  heldSince: Infinity,
  receivers,
  counted: new Set(),
  denied: 0,
  scale: 1,
});

/** The tiles a view's caster walk admits among a tree's, from a camera that sees none of them. */
function casters(
  root: Tile,
  view: SelectionView,
  receivers: CasterRoom["receivers"],
): Tile[] {
  const selection = new BudgetedSelection({
    casterErrorScale: 2,
    dynamicScreenSpaceError: false,
  });
  const { selected } = selection.select(root, 100, view);
  expect(selected).toEqual([]);
  return selection.selectCasters(root, 100, view, selected, room(receivers))
    .casters;
}

/** A camera 1.5 km up looking down and north: tiles 3 km up are behind it. */
const away = (warp?: TileWarp, casterPlanes?: Float64Array) => ({
  ...viewAt(1500, [-Math.SQRT1_2, 0, Math.SQRT1_2], warp),
  ...(casterPlanes && { casterPlanes }),
});

describe("shadow casters on drawn volumes", () => {
  const leaf = (east: number): Tile =>
    tile({
      geometricError: 0,
      boundingVolume: { box: boxAt(3000, east, 0, 500) },
      content: { uri: "a.glb" },
    });

  it("tests casters against the cascade box where they are drawn", () => {
    // Everything is drawn 100 km east of where it is. The box stands at 0.
    const box = cascadeBox([R + 3000, 0, 0], [1e5, 1000, 1000]);
    const warp = shiftWarp(() => [0, 1e5, 0]);
    const none = () => undefined;
    // True 0 (drawn 100 km: out) and true −100 km (drawn 0: in).
    const staysTrue = leaf(0);
    const drawnIn = leaf(-1e5);
    expect(casters(staysTrue, away(warp, box), none)).toEqual([]);
    expect(casters(drawnIn, away(warp, box), none)).toEqual([drawnIn]);
    // Unwarped, the same tiles are tested as they are written.
    const plainTrue = leaf(0);
    const plainFar = leaf(-1e5);
    expect(casters(plainTrue, away(undefined, box), none)).toEqual([plainTrue]);
    expect(casters(plainFar, away(undefined, box), none)).toEqual([]);
  });

  it("builds the light-space rectangle from where the receivers are drawn, and tests casters against it there", () => {
    // A big box that holds everything: the receivers' rectangle decides.
    const box = cascadeBox([R + 3000, 0, 0], [1e7, 1e7, 1e7]);
    // Each tile is moved on its own: the receiver at true −100 km is drawn at
    // 0 (so the rectangle, ±3.5 km, stands there), a caster at 0 stays,
    // another at true −99 km is drawn 300 km east.
    const warp = shiftWarp((y) =>
      y === -100_000 ? [0, 1e5, 0] : y === -99_000 ? [0, 3e5, 0] : [0, 0, 0],
    );
    const receiver = (): Tile =>
      tile({
        geometricError: 0,
        boundingVolume: { box: boxAt(3000, -1e5, 0, 2000) },
        content: { uri: "r.glb" },
      });
    const run = (at: number, drawn: boolean) => {
      const caster = leaf(at);
      const found = casters(caster, away(drawn ? warp : undefined, box), () => [
        [receiver()],
      ]);
      return found.length === 1;
    };
    // Drawn: the one at 0 is inside the rectangle at 0, the one at −99 km is not.
    expect(run(0, true)).toBe(true);
    expect(run(-99_000, true)).toBe(false);
    // As written: the rectangle is the receiver's own, at −100 km.
    expect(run(0, false)).toBe(false);
    expect(run(-99_000, false)).toBe(true);
  });
});

describe("the viewer's request volume on drawn volumes", () => {
  const withRequest = (east: number): Tile =>
    tile({
      geometricError: 0,
      boundingVolume: { box: boxAt(1000, east, 0, 500) },
      viewerRequestVolume: { box: boxAt(1000, east, 0, 2000) },
      content: { uri: "a.glb" },
    });
  const selection = () =>
    new StepwiseSelection({ dynamicScreenSpaceError: false });
  const inside = (root: Tile, view: SelectionView): boolean => {
    selection().select(root, 100, view);
    return root.viewState(0).inRequestVolume;
  };
  const down = [-1, 0, 0];

  it("is in when the camera is in the drawn request volume, not the written one", () => {
    const warp = shiftWarp(() => [0, 1e5, 0]);
    // Written around the camera, drawn 100 km away: out under the warp.
    expect(inside(withRequest(0), viewAt(1000, down, warp))).toBe(false);
    expect(inside(withRequest(0), viewAt(1000, down))).toBe(true);
    // Written 100 km west, drawn around the camera: in under the warp.
    expect(inside(withRequest(-1e5), viewAt(1000, down, warp))).toBe(true);
    expect(inside(withRequest(-1e5), viewAt(1000, down))).toBe(false);
  });

  it("is a conservative sphere, cached with the drawn volumes", () => {
    const warp = shiftWarp(() => [0, 1e5, 0]);
    const root = withRequest(0);
    const first = drawnRequestVolume(root, warp);
    expect(first?.kind).toBe("sphere");
    expect(first?.sphere.center[1]).toBeCloseTo(1e5, 6);
    // Holds the box's corners (half-diagonal √3 · 2000 m).
    expect(first?.sphere.radius).toBeGreaterThanOrEqual(
      2000 * Math.sqrt(3) - 1e-6,
    );
    expect(drawnRequestVolume(root, warp)).toBe(first);
    warp.version++;
    expect(drawnRequestVolume(root, warp)).not.toBe(first);
    const without = tile({
      geometricError: 0,
      boundingVolume: { box: boxAt(1000, 0, 0, 500) },
      content: { uri: "a.glb" },
    });
    expect(drawnRequestVolume(without, warp)).toBeUndefined();
    expect(inside(without, viewAt(1000, down, warp))).toBe(true);
  });
});

describe("the dynamic screen-space error on drawn volumes", () => {
  const horizontal = [0, 1, 0];
  const policy = () => new StepwiseSelection({});
  const density = (
    root: Tile,
    view: SelectionView,
    selection = policy(),
  ): number =>
    (
      selection as unknown as {
        computeDensity(root: Tile, view: SelectionView): number;
      }
    ).computeDensity(root, view);

  /** The 1.x falloff for a globe-sized root centred `up` m up (it spans 0 to 2 · up), seen from `height`. */
  function expected(up: number, height: number): number {
    const selection = policy();
    const close = 2 * up * selection.dynamicScreenSpaceErrorHeightFalloff;
    const t = Math.min(Math.max((height - close) / (2 * up - close), 0), 1);
    return selection.dynamicScreenSpaceErrorDensity * (1 - t);
  }

  const rootAt = (up: number, content?: number): Tile =>
    tile({
      geometricError: 100,
      boundingVolume: { box: boxAt(up, 0, 0, 500) },
      content: {
        uri: "a.glb",
        ...(content !== undefined && {
          boundingVolume: { box: boxAt(content, 0, 0, 500) },
        }),
      },
    });

  it("follows where the root is drawn: 20 km higher, the camera is low in it", () => {
    const warp = shiftWarp(() => [2e4, 0, 0]);
    const view = (w?: TileWarp) => viewAt(5000, horizontal, w);
    const plain = density(rootAt(3000), view());
    // As before: the root 3 km up, the camera 5 km up, above the falloff.
    expect(plain).toBeCloseTo(expected(3000, 5000), 12);
    const drawn = density(rootAt(3000), view(warp));
    expect(drawn).toBeCloseTo(expected(23_000, 5000), 12);
    expect(drawn).toBeGreaterThan(plain);
    // A warp that moves nothing leaves it as it was.
    const still = shiftWarp(() => [0, 0, 0]);
    expect(density(rootAt(3000), view(still))).toBeCloseTo(plain, 12);
  });

  it("uses the root's drawn content volume when it has one", () => {
    const warp = shiftWarp(() => [2e4, 0, 0]);
    const view = viewAt(5000, horizontal, warp);
    // The root's volume is 40 km up, its content 3 km (drawn 23 km up).
    expect(density(rootAt(40_000, 3000), view)).toBeCloseTo(
      expected(23_000, 5000),
      12,
    );
    expect(density(rootAt(40_000, 3000), viewAt(5000, horizontal))).toBeCloseTo(
      expected(3000, 5000),
      12,
    );
  });

  it("is computed on selection with the warp, and not at all when off", () => {
    const warp = shiftWarp(() => [2e4, 0, 0]);
    const selection = policy();
    selection.select(rootAt(3000), 100, viewAt(5000, horizontal, warp));
    const used = (selection as unknown as { density: number }).density;
    expect(used).toBeCloseTo(expected(23_000, 5000), 12);
    const off = new StepwiseSelection({ dynamicScreenSpaceError: false });
    off.select(rootAt(3000), 100, viewAt(5000, horizontal, warp));
    expect((off as unknown as { density: number }).density).toBe(0);
  });
});
