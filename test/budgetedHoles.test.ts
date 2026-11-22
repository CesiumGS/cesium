// A placeholder's clip region is exactly the area nothing else draws (mixed
// LOD, `result.placeholders`): no clip tile may hold a drawn tile, or the
// coarse surface is drawn through finer content (at x4 vertical exaggeration
// the two surfaces are meters apart and show as interpenetrating sheets).
import { describe, expect, it } from "vitest";
import { Camera } from "../packages/next/src/scene/Camera.ts";
import { BudgetedSelection } from "../packages/next/src/streaming/Budgeted.ts";
import type {
  SelectionResult,
  SelectionView,
} from "../packages/next/src/streaming/Stepwise.ts";
import { expectExactPlaceholders } from "./placeholderInvariant.ts";
import {
  treeFromJson,
  type Tile,
} from "../packages/next/src/streaming/Tile.ts";

const R = 6371e3;
const ASPECT = 16 / 9;

interface Json {
  geometricError: number;
  refine: "REPLACE";
  boundingVolume: { box: number[] };
  content: { uri: string };
  children?: Json[];
}

/** A box 3 km above the sphere, `east` m along its equator, half-size `h`. */
function box(east: number, h: number, error: number, children?: Json[]): Json {
  return {
    geometricError: error,
    refine: "REPLACE",
    boundingVolume: { box: [R + 3000, east, 0, h, 0, 0, 0, h, 0, 0, 0, h] },
    content: { uri: "a.glb" },
    ...(children ? { children } : {}),
  };
}

function build(root: Json): Tile {
  const tree = {
    warnings: new Set<string>(),
    tilesAdded: () => {},
  } as unknown as Parameters<typeof treeFromJson>[3];
  return treeFromJson(
    { asset: { version: "1.1" }, geometricError: 8000, root },
    "https://tiles.test/t.json",
    undefined,
    tree,
  ).root;
}

const load = (tile: Tile) => {
  tile.state = "ready";
  tile.bytes = 1000;
};

/** Everything under `tile`, itself included. */
function all(tile: Tile): Tile[] {
  return [tile, ...tile.children.flatMap(all)];
}

function view(height: number): SelectionView {
  const camera = new Camera();
  camera.position.set([R + height, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.from([0, 0, 1]));
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
  planes[20] = 1;
  planes[23] = 5e8 + camera.position[0]!;
  return {
    id: 0,
    position: camera.position,
    direction: camera.direction,
    cartographic: { longitude: 0, latitude: 0, height },
    planes,
    sseDenominator: 2 * Math.tan(camera.fovy(ASPECT) / 2),
    height: 1080,
    pixelRatio: 1,
  };
}

function select(root: Tile, height: number): SelectionResult {
  return new BudgetedSelection({
    dynamicScreenSpaceError: false,
    mixedLod: "always",
  }).select(root, 8000, view(height));
}

/** Twenty narrow children of a tile centered at `east` (half-size 1000). */
const twenty = (east: number, error: number): Json[] =>
  Array.from({ length: 20 }, (_, i) => box(east - 950 + i * 100, 50, error));

describe("placeholders are clipped to exact holes", () => {
  // The camera's height makes the root and the middle level refine and the
  // narrow leaves stop (error 1 m).
  const HEIGHT = 40_000;

  it("a missing child that drew finer content is never a clip box", () => {
    // A: ten resident leaves (drawn last frame, so A holds them) and ten
    // missing ones, more holes than CLIP_BOXES; B: nothing loaded.
    const root = build(
      box(0, 2000, 4000, [
        box(-1000, 1000, 1000, twenty(-1000, 1)),
        box(1000, 1000, 1000, twenty(1000, 1)),
      ]),
    );
    const [a, b] = root.children;
    load(root);
    load(a!);
    for (const c of a!.children.slice(0, 10)) {
      load(c);
      c.appliedMask = 1;
    }
    for (const t of all(a!)) {
      t.residentBelow = t === a ? 1 : 0;
    }
    expect(b).toBeDefined();
    const result = select(root, HEIGHT);
    // Too many holes to clip to, and A drew leaves: no placeholder may name A.
    expect(result.placeholders?.get(root)?.includes(a!) ?? false).toBe(false);
    expectExactPlaceholders(result);
  });

  it("frontier partial: resident finer tiles under a missing tile", () => {
    // A is unloaded with two resident children and a missing one; B is unloaded, bare.
    const root = build(
      box(0, 2000, 4000, [
        box(-1000, 1000, 1, [
          box(-1500, 500, 1),
          box(-700, 300, 1),
          box(-200, 200, 1),
        ]),
        box(1000, 1000, 1),
      ]),
    );
    const [a] = root.children;
    load(root);
    // The third child isn't loaded, so the cache can't cover A whole.
    const resident = a!.children.slice(0, 2);
    for (const c of resident) {
      load(c);
    }
    a!.residentBelow = 2;
    const result = select(root, HEIGHT);
    expectExactPlaceholders(result);
    // The placeholder, if any, is clipped to B alone.
    for (const clip of result.placeholders?.values() ?? []) {
      expect(clip).not.toContain(a);
    }
  });

  it("still makes a placeholder where the holes are exact", () => {
    const root = build(
      box(0, 2000, 4000, [box(-1000, 1000, 1), box(1000, 1000, 1)]),
    );
    // Only the first child is loaded: the second is a clean hole.
    load(root);
    load(root.children[0]!);
    const result = select(root, HEIGHT);
    expect(result.selected).toContain(root.children[0]);
    expect(result.placeholders?.get(root)).toEqual([root.children[1]]);
    expectExactPlaceholders(result);
  });
});
