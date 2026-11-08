// What the caster walk selects (`BudgetedSelection.selectCasters`), on
// synthetic trees with the real cascade fit: no GPU, no tileset.
import { describe, expect, it } from "vitest";
import { GlobeBudgetedSelection } from "../src/globe/GlobeBudgeted.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { Camera } from "../src/scene/Camera.ts";
import {
  casterPlanes,
  createShadowCascades,
  fitShadowCascades,
} from "../src/scene/shadows.ts";
import { BudgetedSelection } from "../src/streaming/Budgeted.ts";
import type { CasterRoom, SelectionView } from "../src/streaming/Stepwise.ts";
import { treeFromJson, type Tile } from "../src/streaming/Tile.ts";
import type { TerrainSource } from "../src/globe/TerrainSource.ts";

const R = 6_378_137;
const HEIGHT = 1080;
const ASPECT = 16 / 9;

interface Json {
  geometricError: number;
  refine?: "ADD" | "REPLACE";
  boundingVolume: { box: number[] };
  content?: { uri: string };
  children?: Json[];
}

/** A box at (x up, y east, z north) of the Earth's surface at longitude 0, latitude 0. */
function box(
  x: number,
  y: number,
  z: number,
  hx: number,
  hy: number,
  hz: number,
  error: number,
  uri?: string,
  children?: Json[],
  refine?: "ADD" | "REPLACE",
): Json {
  return {
    geometricError: error,
    ...(refine ? { refine } : {}),
    boundingVolume: { box: [R + x, y, z, hx, 0, 0, 0, hy, 0, 0, 0, hz] },
    ...(uri ? { content: { uri } } : {}),
    ...(children ? { children } : {}),
  };
}

function build(root: Json): Tile {
  const tree = {
    warnings: new Set<string>(),
    tilesAdded: () => {},
  } as unknown as Parameters<typeof treeFromJson>[3];
  return treeFromJson(
    {
      asset: { version: "1.1" },
      geometricError: root.geometricError * 2,
      root,
    },
    "https://tiles.test/t.json",
    undefined,
    tree,
  ).root;
}

function all(root: Tile, visit: (tile: Tile) => void): void {
  visit(root);
  for (const child of root.children) {
    all(child, visit);
  }
}

function ready(root: Tile, bytes = 1000): void {
  all(root, (tile) => {
    if (tile.renderable) {
      tile.state = "ready";
      tile.bytes = bytes;
    }
  });
}

function sunAt(elevationDeg: number, azimuthDeg: number): number[] {
  const e = (elevationDeg * Math.PI) / 180;
  const a = (azimuthDeg * Math.PI) / 180;
  return [Math.sin(e), Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a)];
}

/** A view `height` m up at longitude 0, latitude 0, pitched, with its cascades. */
function viewAt(
  height: number,
  pitchDeg: number,
  sun: number[],
  shown?: { near: number; far: number },
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
  const cascades = createShadowCascades();
  fitShadowCascades(cascades, camera, ASPECT, sun, Math.max(height, 2), shown);
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
    casterPlanes: casterPlanes(cascades, camera.position),
  } as unknown as SelectionView;
}

const policy = () =>
  new BudgetedSelection({
    casterErrorScale: 2,
    dynamicScreenSpaceError: false,
  });

/** Room for everything, as `Tileset3D` makes it each update. */
const room = (overrides: Partial<CasterRoom> = {}): CasterRoom => ({
  bytes: Infinity,
  load: true,
  estimate: 1,
  pressure: 0,
  heldSince: Infinity,
  receivers: (_, selected) => [selected],
  counted: new Set(),
  denied: 0,
  scale: 1,
  ...overrides,
});

/** A view's walk, then its casters' walk, as `Tileset3D.update` runs them. */
function select(
  selection: BudgetedSelection,
  root: Tile,
  rootError: number,
  view: SelectionView,
  into: CasterRoom = room(),
) {
  const result = selection.select(root, rootError, view);
  const { casters, wanted } = selection.selectCasters(
    root,
    rootError,
    view,
    result.selected,
    into,
  );
  return {
    selected: result.selected,
    casters,
    wanted: wanted.map(([tile]) => tile),
  };
}

describe("caster selection", () => {
  it("drops the children of an ADD tile that are too small to see, as the view does", () => {
    // 10,000 building leaves under one ADD parent, 1,500 m up, the sun low
    // behind. The parent's error is 200 m: 6 pixels over a 1080-pixel view
    // from 5 km at this field of view, under twice the threshold.
    const n = 100;
    const half = 5000;
    const leaves: Json[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const y = -half + (2 * half * (i + 0.5)) / n;
        const z = -half + (2 * half * (j + 0.5)) / n;
        leaves.push(box(30, y, z, 30, half / n, half / n, 0, `b${i}_${j}.glb`));
      }
    }
    const root = build(
      box(30, 0, 0, 30, half, half, 200, undefined, leaves, "ADD"),
    );
    ready(root);
    const view = viewAt(1500, -45, sunAt(20, 180), { near: 800, far: 12000 });
    const result = select(policy(), root, 400, view);
    const casters = result.casters.length;
    // Before: 93% of the tileset (9,338 of 10,000). Now it follows the
    // children's apparent size, as the view's own walk does.
    expect(result.selected.length + casters).toBeLessThan(n * n * 0.5);
    expect(result.wanted.length).toBe(0);
  });

  it("selects none and requests none with no tile selected yet", () => {
    const root = build(box(30, 0, 500, 30, 50, 50, 0, "a.glb"));
    ready(root);
    const view = viewAt(2, 90, sunAt(45, 180)); // looking at the sky
    const result = select(policy(), root, 100, view);
    expect(result.selected).toEqual([]);
    expect(result.casters).toEqual([]);
    expect(result.wanted).toEqual([]);
  });

  it("selects none for terrain", () => {
    const root = build(box(0, 0, 0, 1000, 1000, 1000, 0, "terrain.glb"));
    ready(root);
    const view = viewAt(2, 0, sunAt(45, 180));
    const globe = new GlobeBudgetedSelection({} as unknown as TerrainSource, {
      casterErrorScale: 2,
    });
    expect(globe.castsShadows).toBe(false);
    expect(select(globe, root, 100, view).casters).toEqual([]);
  });

  it("doesn't cast a coarse parent that is on screen over the finer tile it draws", () => {
    // P holds C1 (in view, 20 m ahead) and C2 (behind the camera, up-sun,
    // not loaded). P is drawn on screen as well as covering C1.
    const c1 = box(0, 0, 20, 5, 10, 10, 0, "c1.glb");
    const c2 = box(15, 0, -5, 5, 5, 5, 0, "c2.glb");
    const p = box(8, 0, 8, 12, 12, 30, 500, "p.glb", [c1, c2]);
    const root = build(p);
    const [c1Tile, c2Tile] = root.children as [Tile, Tile];
    root.state = "ready";
    root.bytes = 1000;
    c1Tile.state = "ready";
    c1Tile.bytes = 1000;
    const result = select(
      new BudgetedSelection({
        casterErrorScale: 1,
        dynamicScreenSpaceError: false,
      }),
      root,
      1000,
      viewAt(2, 0, sunAt(45, 180), { near: 1, far: 300 }),
    );
    expect(result.selected).toContain(c1Tile);
    expect(result.casters).not.toContain(root);
    // C2 is wanted; nothing stands in for it.
    expect(result.wanted).toContain(c2Tile);
  });

  it("selects a roof 40 m up at a low sun, which a cap along the ray dropped", () => {
    // Floor 20 m ahead. The roof is 40 m up and 207 m behind the camera:
    // its shadow at 10 degrees falls on the floor. Shadows from 30 m out.
    const floor = box(0, 0, 20, 1, 10, 10, 0, "floor.glb");
    const roof = box(40, 0, -207, 1, 5, 5, 0, "roof.glb");
    const beside = box(40, 300, -207, 1, 5, 5, 0, "beside.glb");
    const root = build(
      box(
        0,
        0,
        0,
        500,
        500,
        500,
        1000,
        undefined,
        [floor, roof, beside],
        "ADD",
      ),
    );
    ready(root);
    const view = viewAt(2, 0, sunAt(10, 180), { near: 0.5, far: 30 });
    const result = select(policy(), root, 1000, view);
    const [floorTile, roofTile, besideTile] = root.children as Tile[];
    expect(result.selected).toContain(floorTile);
    expect(result.casters).toContain(roofTile);
    // Beside the receivers' rectangle, in the light's view: no shadow in view.
    expect(result.casters).not.toContain(besideTile);
  });

  it("admits the nearest casters first, and not what would pass the bytes", () => {
    const floor = box(0, 0, 20, 1, 10, 10, 0, "floor.glb");
    const near = box(15, 0, -5, 1, 5, 5, 0, "near.glb");
    const far = box(30, 0, -25, 1, 5, 5, 0, "far.glb");
    const root = build(
      box(0, 0, 0, 500, 500, 500, 1000, undefined, [floor, far, near], "ADD"),
    );
    ready(root, 1000);
    const view = viewAt(2, 0, sunAt(45, 180), { near: 0.5, far: 300 });
    const into = room({ bytes: 1500 });
    const result = select(policy(), root, 1000, view, into);
    const [, farTile, nearTile] = root.children as Tile[];
    expect(result.casters).toEqual([nearTile]);
    expect(result.casters).not.toContain(farTile);
    expect(into.denied).toBe(1000);
    expect(into.bytes).toBe(500);
  });

  it("counts a caster two views share once, and what stays in the cache anyway not at all", () => {
    const floor = box(0, 0, 20, 1, 10, 10, 0, "floor.glb");
    const near = box(15, 0, -5, 1, 5, 5, 0, "near.glb");
    const root = build(
      box(0, 0, 0, 500, 500, 500, 1000, undefined, [floor, near], "ADD"),
    );
    ready(root);
    const [, nearTile] = root.children as [Tile, Tile];
    const view = viewAt(2, 0, sunAt(45, 180), { near: 0.5, far: 300 });
    const selection = policy();
    const into = room({ bytes: 1000 });
    expect(select(selection, root, 1000, view, into).casters).toEqual([
      nearTile,
    ]);
    expect(into.bytes).toBe(0);
    expect(select(selection, root, 1000, view, into).casters).toEqual([
      nearTile,
    ]);
    expect(into.bytes).toBe(0);
    // A tile a view used lately stays anyway: casting costs nothing.
    nearTile.viewedAt = 10;
    const held = room({ bytes: 0, heldSince: 5 });
    expect(select(selection, root, 1000, view, held).casters).toEqual([
      nearTile,
    ]);
    expect(held.denied).toBe(0);
  });

  it("coarsens to the finest scale that fits, and needn't for a tile that can't fit at all", () => {
    // A parent off screen and up-sun, its four children finer: the parent
    // alone at a coarser scale, and a floor in view.
    const kids = [-1, 1].flatMap((a) =>
      [-1, 1].map((b) =>
        box(15, a * 2.5, -5 + b * 2.5, 1, 2.5, 2.5, 0, `k${a}${b}.glb`),
      ),
    );
    const parent = box(15, 0, -5, 1, 5, 5, 2, "parent.glb", kids, "REPLACE");
    const floor = box(0, 0, 20, 1, 10, 10, 0, "floor.glb");
    const root = build(
      box(0, 0, 0, 500, 500, 500, 1000, undefined, [floor, parent], "ADD"),
    );
    ready(root);
    const parentTile = root.children[1] as Tile;
    const view = viewAt(2, 0, sunAt(45, 180), { near: 0.5, far: 300 });
    const fine = room();
    const finer = select(policy(), root, 1000, view, fine).casters;
    expect(finer.length).toBe(4);
    expect(finer.every((t) => parentTile.children.includes(t))).toBe(true);
    expect(fine.scale).toBe(1);
    // Room for one tile: the parent, coarser, not one child of four.
    const coarse = room({ bytes: 1000 });
    expect(select(policy(), root, 1000, view, coarse).casters).toEqual([
      parentTile,
    ]);
    expect(coarse.scale).toBeGreaterThan(1);
    expect(coarse.denied).toBe(0);
    // One child far too large stays out, and the others stay fine.
    (parentTile.children[0] as Tile).bytes = 1_000_000;
    const huge = room({ bytes: 3000 });
    const rest = select(policy(), root, 1000, view, huge).casters;
    expect(rest.length).toBe(3);
    expect(rest).not.toContain(parentTile.children[0]);
    expect(huge.scale).toBe(1);
    expect(huge.denied).toBe(1_000_000);
  });

  it("doesn't want a tile that failed to fit until the pools have more room", () => {
    const floor = box(0, 0, 20, 1, 10, 10, 0, "floor.glb");
    const roof = box(15, 0, -5, 1, 5, 5, 0, "roof.glb");
    const root = build(
      box(0, 0, 0, 500, 500, 500, 1000, undefined, [floor, roof], "ADD"),
    );
    ready(root);
    const roofTile = root.children[1] as Tile;
    roofTile.state = "unloaded";
    roofTile.noFitAt = 0.5;
    const view = viewAt(2, 0, sunAt(45, 180), { near: 0.5, far: 300 });
    expect(
      select(policy(), root, 1000, view, room({ pressure: 0.5 })).wanted,
    ).toEqual([]);
    expect(
      select(policy(), root, 1000, view, room({ pressure: 0.4 })).wanted,
    ).toEqual([roofTile]);
  });
});
