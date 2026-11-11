// Selection under a warped anchor (plan §13.26, increment 3): tiles are
// selected on their drawn volumes (distance, frustum, screen-space error),
// the geometric error is stretched by σ_max and added to the fit's error, and
// the horizon test is off for them. Synthetic trees and a `TileWarp` made of
// the same maps the engine uses; the engine's wiring is in warpWorld.test.ts.
import { describe, expect, it, vi } from "vitest";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import { routeForward, type Route, type Warp } from "../src/camera/route.ts";
import { Camera } from "../src/scene/Camera.ts";
import { drawnBounds, routeMap } from "../src/scene/warpBounds.ts";
import { BudgetedSelection } from "../src/streaming/Budgeted.ts";
import {
  StepwiseSelection,
  type SelectionView,
} from "../src/streaming/Stepwise.ts";
import { treeFromJson, type Tile } from "../src/streaming/Tile.ts";
import { drawnTile, type TileWarp } from "../src/streaming/tileWarp.ts";

const R = 6371e3;
const HEIGHT = 1080;
const ASPECT = 16 / 9;

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

const key = (name: string): FrameKey => ({ name });

/** A repeatable stream in [-1, 1) (a linear congruential generator). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

function exaggerationRoute(k: number): Route {
  const warp: Warp = {
    from: key("itrf"),
    to: key("exaggerated"),
    presentation: true,
    revision: 1,
    forward: (p, out, jacobian) => exaggerate(k, p, out, jacobian),
  };
  return {
    frame: key("itrf"),
    base: key("exaggerated"),
    seconds: 0,
    steps: [{ kind: "warp", warp, inverse: false }],
    presentation: true,
    revision: 1,
  };
}

/** A `TileWarp` for a vertical exaggeration by `k`, as `World.tileWarp` makes one from a route. */
function exaggeration(
  k: number,
  fit = 0,
): TileWarp & { calls: { bounds: number }; version: number } {
  const map = routeMap(exaggerationRoute(k));
  const calls = { bounds: 0 };
  return {
    version: 1,
    fitVersion: 0,
    calls,
    bounds(points, spacing) {
      calls.bounds++;
      return drawnBounds([map], points, spacing);
    },
    fitError: () => fit,
  };
}

interface Json {
  geometricError: number;
  refine?: "ADD" | "REPLACE";
  boundingVolume: { box: number[] };
  content?: { uri: string };
  children?: Json[];
}

/** A box `up` m above the sphere and `east` m along its equator, half-sizes `h`. */
function box(
  up: number,
  east: number,
  h: number,
  error: number,
  children?: Json[],
): Json {
  return {
    geometricError: error,
    refine: "REPLACE",
    boundingVolume: { box: [R + up, east, 0, h, 0, 0, 0, h, 0, 0, 0, h] },
    content: { uri: "a.glb" },
    ...(children ? { children } : {}),
  };
}

function build(root: Json, tilesetError: number): Tile {
  const tree = {
    warnings: new Set<string>(),
    tilesAdded: () => {},
  } as unknown as Parameters<typeof treeFromJson>[3];
  const built = treeFromJson(
    { asset: { version: "1.1" }, geometricError: tilesetError, root },
    "https://tiles.test/t.json",
    undefined,
    tree,
  ).root;
  const ready = (tile: Tile): void => {
    tile.state = "ready";
    tile.bytes = 1000;
    tile.children.forEach(ready);
  };
  ready(built);
  return built;
}

function depthOf(tile: Tile): number {
  let d = 0;
  for (let t = tile.parent; t; t = t.parent) {
    d++;
  }
  return d;
}

/** A camera at `position` looking along `direction`, with up `up`. */
function viewAt(
  position: number[],
  direction: number[],
  up: number[],
  warp?: TileWarp,
): SelectionView {
  const camera = new Camera();
  camera.position.set(position);
  camera.direction.set(direction);
  camera.orient(Float64Array.from(up));
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
    cartographic: { longitude: 0, latitude: 0, height: position[0]! - R },
    planes,
    sseDenominator: 2 * Math.tan(camera.fovy(ASPECT) / 2),
    height: HEIGHT,
    pixelRatio: 1,
    ...(warp && { warp }),
  };
}

/** Three levels: a tile, two children, four grandchildren; geometric errors 4000, 1000, 200. */
function tree(): Tile {
  const grandchildren = (east: number) => [
    box(3000, east - 500, 500, 200),
    box(3000, east + 500, 500, 200),
  ];
  return build(
    box(3000, 0, 2000, 4000, [
      box(3000, -1000, 1000, 1000, grandchildren(-1000)),
      box(3000, 1000, 1000, 1000, grandchildren(1000)),
    ]),
    8000,
  );
}

const down = (height: number, warp?: TileWarp) =>
  viewAt([R + height, 0, 0], [-1, 0, 0], [0, 0, 1], warp);

const selection = () =>
  new StepwiseSelection({ dynamicScreenSpaceError: false });

describe("selection on drawn volumes", () => {
  it("refines a tile more at k = 10 than at k = 1, at the same camera", () => {
    const at = (k: number | undefined) => {
      const root = tree();
      const view = down(200_000, k === undefined ? undefined : exaggeration(k));
      const { selected } = selection().select(
        root,
        root.geometricError * 2,
        view,
      );
      return selected.map(depthOf);
    };
    const flat = at(1);
    const exaggerated = at(10);
    // The stretched error and the nearer drawn tile: one level down.
    expect(Math.min(...flat)).toBe(1);
    expect(Math.min(...exaggerated)).toBe(2);
    expect(exaggerated.length).toBeGreaterThan(flat.length);
    // A warp that does nothing selects as no warp does.
    expect(at(undefined)).toEqual(flat);
  });

  it("measures distance to the drawn volume, and culls by it", () => {
    const root = tree();
    const warp = exaggeration(10);
    const view = down(200_000, warp);
    selection().select(root, root.geometricError * 2, view);
    const state = root.viewState(0);
    const drawn = drawnTile(root, warp).volume;
    expect(drawn.kind).toBe("sphere");
    // The tile's top is 5 km up and is drawn 50 km up: 150 km, not 195 km.
    expect(state.distance).toBeGreaterThan(130_000);
    expect(state.distance).toBeLessThan(155_000);
    // A camera that looks down at where the tile is, but not where it is drawn.
    const near = viewAt(
      [R + 8000, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      exaggeration(10),
    );
    const other = tree();
    const result = selection().select(other, other.geometricError * 2, near);
    // Drawn 10 to 50 km up, the tile is above this camera (looking down):
    // culled, though its true volume is 3 to 7 km in front of it.
    expect(result.selected).toEqual([]);
    expect(other.viewState(0).visible).toBe(false);
    const rigid = tree();
    selection().select(rigid, rigid.geometricError * 2, down(8000));
    expect(rigid.viewState(0).visible).toBe(true);
  });

  it("stretches the geometric error by σ_max and adds the fit's", () => {
    const root = tree();
    const k1 = exaggeration(1);
    selection().select(root, root.geometricError * 2, down(200_000, k1));
    const flat = root.viewState(0);
    const sse1 = flat.sse;
    const d1 = flat.distance;
    const k10 = exaggeration(10);
    const big = tree();
    selection().select(big, big.geometricError * 2, down(200_000, k10));
    const stretched = big.viewState(0);
    const sigma = drawnTile(big, k10).sigmaMax;
    expect(sigma).toBeCloseTo(10, 6);
    // sse = error · σ · height / (distance · denominator).
    const view = down(200_000, k10);
    const scale = HEIGHT / view.sseDenominator;
    expect(sse1).toBeCloseTo((root.geometricError * scale) / d1, 6);
    expect(stretched.sse).toBeCloseTo(
      (big.geometricError * sigma * scale) / stretched.distance,
      6,
    );
    // The fit's error, m, adds to the stretched one.
    const fitted = tree();
    const withFit = exaggeration(10, 100);
    fitted.placement = {
      draws: [{ index: 0 }],
    } as unknown as Tile["placement"];
    selection().select(
      fitted,
      fitted.geometricError * 2,
      down(200_000, withFit),
    );
    expect(fitted.viewState(0).sse).toBeCloseTo(
      ((fitted.geometricError * sigma + 100) * scale) /
        fitted.viewState(0).distance,
      6,
    );
  });

  it("caches a tile's drawn volume per map version, and remakes it when the version moves", () => {
    const root = tree();
    const warp = exaggeration(10);
    const first = drawnTile(root, warp);
    expect(drawnTile(root, warp)).toBe(first);
    expect(warp.calls.bounds).toBe(1);
    warp.version++;
    const second = drawnTile(root, warp);
    expect(second).not.toBe(first);
    expect(warp.calls.bounds).toBe(2);
    // A fit landing rereads the error without remaking the volume.
    const spy = vi.spyOn(warp, "fitError");
    (warp as { fitVersion: number }).fitVersion++;
    root.placement = { draws: [] } as unknown as Tile["placement"];
    expect(drawnTile(root, warp).volume).toBe(second.volume);
    expect(spy).toHaveBeenCalledTimes(1);
    // Another map: its own.
    expect(drawnTile(root, exaggeration(3))).not.toBe(second);
  });

  it("carries a sphere volume's centre and stretches its radius", () => {
    const json: Json = {
      geometricError: 100,
      boundingVolume: { sphere: [R + 3000, 0, 0, 400] } as never,
      content: { uri: "a.glb" },
    };
    const root = build(json, 200);
    const drawn = drawnTile(root, exaggeration(10));
    expect(drawn.volume.kind).toBe("sphere");
    expect(drawn.volume.sphere.center[0]!).toBeCloseTo(R + 30_000, 3);
    expect(drawn.volume.sphere.radius).toBeGreaterThanOrEqual(4000);
    expect(drawn.volume.sphere.radius).toBeLessThan(4001);
  });

  /** A box tile `up` high and `across` wide on each side, 3 km up, with random points in it. */
  function boxTile(up: number, across: number): Tile {
    return build(
      {
        geometricError: 100,
        boundingVolume: {
          box: [R + 3000, 0, 0, up, 0, 0, 0, across, 0, 0, 0, across],
        },
        content: { uri: "a.glb" },
      },
      200,
    );
  }

  it("holds the whole warped box, bulge included: 5,000 random points of a 200 km tile at k = 10", () => {
    const warp = exaggeration(10);
    const map = routeMap(exaggerationRoute(10));
    const next = random(11);
    for (const [up, across] of [
      [500, 5000],
      [5000, 100_000],
    ] as const) {
      const root = boxTile(up, across);
      const sphere = drawnTile(root, warp).volume.sphere;
      const out = new Float64Array(3);
      let worst = 0;
      for (let i = 0; i < 5000; i++) {
        const p = [R + 3000 + next() * up, next() * across, next() * across];
        routeForward(exaggerationRoute(10), p, out);
        worst = Math.max(
          worst,
          Math.hypot(
            out[0]! - sphere.center[0]!,
            out[1]! - sphere.center[1]!,
            out[2]! - sphere.center[2]!,
          ),
        );
      }
      expect(worst, `${across * 2} m tile`).toBeLessThanOrEqual(sphere.radius);
      // Against the 9 points (centre and corners) it replaces.
      const box = root.volume.kind === "box" ? root.volume.obb : undefined;
      const h = box!.halfAxes;
      const c = box!.center;
      const nine = [c[0]!, c[1]!, c[2]!];
      for (let i = 0; i < 8; i++) {
        const [sx, sy, sz] = [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1];
        nine.push(
          c[0]! + sx * h[0]! + sy * h[3]! + sz * h[6]!,
          c[1]! + sx * h[1]! + sy * h[4]! + sz * h[7]!,
          c[2]! + sx * h[2]! + sy * h[5]! + sz * h[8]!,
        );
      }
      const old = drawnBounds([map], nine);
      expect(sphere.radius).toBeGreaterThanOrEqual(old.radius);
    }
  });
});

describe("the horizon", () => {
  /** A tile 20° east on the equator, past the horizon of a camera 1 km up at longitude 0, in its frustum. */
  function far(): { root: Tile; view: (warp?: TileWarp) => SelectionView } {
    const angle = (20 * Math.PI) / 180;
    const json: Json = {
      geometricError: 1e6,
      refine: "REPLACE",
      boundingVolume: {
        box: [
          R * Math.cos(angle),
          R * Math.sin(angle),
          0,
          500,
          0,
          0,
          0,
          500,
          0,
          0,
          0,
          500,
        ],
      },
      content: { uri: "a.glb" },
    };
    return {
      root: build(json, 2e6),
      view: (warp) => viewAt([R + 1000, 0, 0], [0, 1, 0], [1, 0, 0], warp),
    };
  }

  it("culls a tile past the horizon, and not under a warped anchor", () => {
    const policy = () =>
      new BudgetedSelection({ dynamicScreenSpaceError: false });
    const plain = far();
    const culled = policy().select(plain.root, 2e6, plain.view());
    expect(culled.selected).toEqual([]);
    expect(plain.root.viewState(0).visible).toBe(false);
    // Under a warp the occluder is another shape: no horizon test, so the
    // frustum and the error decide.
    const warped = far();
    const shown = policy().select(
      warped.root,
      2e6,
      warped.view(exaggeration(1)),
    );
    expect(shown.selected).toEqual([warped.root]);
    // The same camera and tile with the horizon test off agrees.
    const off = far();
    const free = policy();
    free.horizonCulling = false;
    expect(free.select(off.root, 2e6, off.view()).selected).toEqual([off.root]);
  });
});
