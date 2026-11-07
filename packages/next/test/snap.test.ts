// Plan 4b task 16: ClientSnapService over retained tile geometry, View.toPixel,
// and Tileset3D's retainGeometry (with World.drawMatrix).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ClientSnapService } from "../src/engineering/snap.ts";
import type { PickView } from "../src/engineering/pick.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import type { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { CanvasTarget, OffscreenTarget, View } from "../src/scene/View.ts";
import type { DrawHandle, World } from "../src/scene/World.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { TileGeometry } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const frame = { name: "fake" } as unknown as EngineeringFrame;
const DRAW = { index: 3, generation: 1, name: undefined } as DrawHandle;
const GEOMETRIC_ERROR = 0.25;

// The camera is 1000 m above (R, 0, 0) looking down -x, with +y right and
// +z up on the screen. The view is 1000 × 500 CSS px with a 90° horizontal
// field of view, so 1 CSS px is 2 m at the tile, and (R, y, z) shows at
// (500 + y / 2, 250 - z / 2).
const toScreen = (y: number, z: number) => [500 + y / 2, 250 - z / 2] as const;

// A 40 m square of two triangles in the plane x = R: A (0, 0), B (40, 0),
// C (0, 40) and D (40, 40) in (y, z), local to a translation to (R, 0, 0).
function geometry(): TileGeometry {
  const matrix = m4.mat4();
  matrix[12] = R;
  return {
    draw: DRAW,
    positions: new Float32Array([0, 0, 0, 0, 40, 0, 0, 0, 40, 0, 40, 40]),
    indices: new Uint32Array([0, 1, 3, 0, 3, 2]),
    matrix,
  };
}

function placement(): TilesetPlacement {
  return {
    mode: "rigid",
    frame,
    displayed: (d) => Float64Array.from(d),
    designOf: (p: ArrayLike<number>) =>
      Float64Array.from([p[0]! - R, p[1]! * 2, p[2]! * 3]),
    displayError: () => 0,
  };
}

function tileset(
  o: {
    placement?: TilesetPlacement;
    retain?: boolean;
    owns?: boolean;
  } = {},
): Tileset3D {
  const retain = o.retain ?? true;
  const tile = {
    geometricError: GEOMETRIC_ERROR,
    volume: {
      kind: "sphere",
      sphere: { center: Float64Array.from([R, 20, 20]), radius: 200 },
    },
    contentVolume: undefined,
    ...(retain && { geometry: [geometry()] }),
  };
  return {
    placement: o.placement,
    retainGeometry: retain,
    warnings: new Set<string>(),
    tileOfDraw: (d: DrawHandle) =>
      (o.owns ?? true) &&
      d.index === DRAW.index &&
      d.generation === DRAW.generation
        ? tile
        : undefined,
    isDestroyed: () => false,
  } as unknown as Tileset3D;
}

/** The raw hit under a CSS pixel: on the plane x = R. */
function under(x: number, y: number): Float64Array {
  return Float64Array.from([R, (x - 500) * 2, (250 - y) * 2]);
}

function view(
  o: { sky?: boolean; feature?: boolean; onPick?: (c: Camera) => void } = {},
): PickView {
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.from([0, 0, 1]));
  camera.fov = Math.PI / 2;
  return {
    pick: async () => {
      o.onPick?.(camera);
      return o.feature === false
        ? undefined
        : { featureId: 7, name: undefined };
    },
    pickPosition: async (x, y) => (o.sky ? undefined : under(x, y)),
    body: EARTH,
    camera,
    target: { kind: "canvas", width: 1000, pixelRatio: 1 },
    pixelRect: () => ({ width: 1000, height: 500 }),
    world: { feature: () => ({ draw: DRAW }) },
  };
}

describe("ClientSnapService", () => {
  it("snaps to a vertex within the aperture, exactly", async () => {
    const [x, y] = toScreen(40, 0);
    const ts = tileset({ placement: placement() });
    const r = await new ClientSnapService([ts]).snap({
      view: view(),
      x: x + 3,
      y,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.point)).toEqual([R, 40, 0]);
    expect(Array.from(r!.raw)).toEqual(Array.from(under(x + 3, y)));
    expect(r!.distance).toBeCloseTo(3, 9);
    expect(r!.exact).toBe(false);
    expect(r!.tileset).toBe(ts);
    expect(r!.curve).toBeUndefined();
    // The face normal, toward the camera.
    expect(Array.from(r!.normal!)).toEqual([1, 0, 0]);
  });

  it("snaps to the nearest point of an edge", async () => {
    const [x, y] = toScreen(20, 0);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x,
      y: y + 3,
      aperture: 6,
    });
    expect(r?.kind).toBe("segment");
    expect(r!.point[0]).toBe(R);
    expect(r!.point[1]).toBeCloseTo(20, 9);
    expect(r!.point[2]).toBeCloseTo(0, 9);
    expect(r!.distance).toBeCloseTo(3, 9);
    expect(r!.curve!.map((p) => Array.from(p))).toEqual([
      [R, 0, 0],
      [R, 40, 0],
    ]);
  });

  it("gives the raw hit as a surface 20 px from everything", async () => {
    const [x, y] = toScreen(40, 0);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: x + 20,
      y: y + 20,
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    const raw = Array.from(under(x + 20, y + 20));
    expect(Array.from(r!.point)).toEqual(raw);
    expect(Array.from(r!.raw)).toEqual(raw);
    expect(r!.distance).toBe(0);
    expect(r!.exact).toBe(false);
  });

  it("states the tile's geometric error as the tolerance", async () => {
    const [x, y] = toScreen(0, 40);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: x - 2,
      y: y + 1,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.point)).toEqual([R, 0, 40]);
    expect(r!.tolerance).toBe(GEOMETRIC_ERROR);
  });

  it("gives design coordinates through the placement", async () => {
    const pl = placement();
    const [x, y] = toScreen(40, 40);
    const r = await new ClientSnapService([tileset({ placement: pl })]).snap({
      view: view(),
      x: x + 1,
      y: y - 1,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(r!.design!.engineeringFrame).toBe(frame);
    expect(Array.from(r!.design!.design)).toEqual([0, 80, 120]);
    expect(r!.design!.obtained).toEqual({
      how: "snap",
      tolerance: GEOMETRIC_ERROR,
      kind: "point",
    });
  });

  it("gives a surface and warns once when the geometry isn't retained", async () => {
    const ts = tileset({ retain: false, placement: placement() });
    const add = vi.spyOn(ts.warnings, "add");
    const service = new ClientSnapService([ts]);
    const [x, y] = toScreen(40, 0);
    for (let i = 0; i < 3; i++) {
      const r = await service.snap({ view: view(), x, y, aperture: 6 });
      expect(r?.kind).toBe("surface");
      expect(Array.from(r!.point)).toEqual(Array.from(under(x, y)));
      expect(r!.design?.obtained?.kind).toBe("surface");
    }
    expect([...ts.warnings]).toEqual(["snap: geometry not retained"]);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("throws for an aperture that is negative or not finite", async () => {
    const service = new ClientSnapService([tileset()]);
    for (const aperture of [-1, NaN, Infinity]) {
      await expect(
        service.snap({ view: view(), x: 1, y: 1, aperture }),
      ).rejects.toThrow(/aperture/);
    }
  });
});

describe("ClientSnapService: no design answer (Review Focus 4)", () => {
  const near = toScreen(40, 0);

  it("resolves undefined over the sky", async () => {
    const r = await new ClientSnapService([
      tileset({ placement: placement() }),
    ]).snap({ view: view({ sky: true }), x: 1, y: 1, aperture: 6 });
    expect(r).toBeUndefined();
  });

  it("snaps on a tileset without a placement, with no design", async () => {
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(r!.design).toBeUndefined();
  });

  it("gives the raw surface for a draw not in the given tilesets", async () => {
    const other = tileset({ owns: false, placement: placement() });
    const r = await new ClientSnapService([other]).snap({
      view: view(),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    expect(r!.tileset).toBeUndefined();
    expect(r!.design).toBeUndefined();
    expect([...other.warnings]).toEqual([]);
  });

  it("gives the raw surface, with no design, when the camera keeps moving", async () => {
    const r = await new ClientSnapService([
      tileset({ placement: placement() }),
    ]).snap({
      view: view({ onPick: (c) => c.version++ }),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    expect(r!.design).toBeUndefined();
    expect(r!.tileset).toBeUndefined();
  });

  it("projects with the camera of the pick's frame, not a later one", async () => {
    // The camera turns once the pick has checked its frame (the feature is
    // resolved after): the snap still lands on the vertex that frame showed
    // under the cursor.
    const v = view();
    const camera = v.camera as Camera;
    v.world.feature = () => {
      camera.direction.set([-1, 0.5, 0]);
      camera.orient(Float64Array.from([0, 0, 1]));
      return { draw: DRAW };
    };
    const r = await new ClientSnapService([tileset()]).snap({
      view: v,
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.point)).toEqual([R, 40, 0]);
  });
});

function expectPixel(p: Float64Array | undefined, x: number, y: number) {
  expect(p).toHaveLength(2);
  expect(p![0]).toBeCloseTo(x, 9);
  expect(p![1]).toBeCloseTo(y, 9);
}

describe("View.toPixel", () => {
  function realView(target: OffscreenTarget | CanvasTarget): View {
    const v = new View({ target, world: {} as World });
    v.camera.position.set([R + 1000, 0, 0]);
    v.camera.direction.set([-1, 0, 0]);
    v.camera.orient(Float64Array.from([0, 0, 1]));
    v.camera.fov = Math.PI / 2;
    return v;
  }

  it("gives CSS pixels from the view's top-left", () => {
    const v = realView(new OffscreenTarget(1000, 500));
    expectPixel(v.toPixel([R, 40, -20]), 520, 260);
    // The viewport's offset within the target doesn't move it.
    v.viewport = { x: 0.5, y: 0, width: 0.5, height: 1 };
    // 500 × 500: aspect 1, fovy 90°: 1 px is 4 m at 1000 m.
    expectPixel(v.toPixel([R, 40, -20]), 260, 255);
  });

  it("divides by the canvas's pixel ratio", () => {
    const canvas = { width: 2000, height: 1000, clientWidth: 1000 };
    const v = realView(
      new CanvasTarget(canvas as unknown as HTMLCanvasElement, {
        pixelRatio: 2,
      }),
    );
    expectPixel(v.toPixel([R, 40, -20]), 520, 260);
  });

  it("is undefined behind the camera", () => {
    const v = realView(new OffscreenTarget(1000, 500));
    expect(v.toPixel([R + 2000, 0, 0])).toBeUndefined();
    expect(v.toPixel([R + 1000, 5, 0])).toBeUndefined();
  });
});

// ------------------------------------------------- Tileset3D.retainGeometry

const BASE = "https://tiles.test/snap/";
const URL_ = `${BASE}tileset.json`;

/** Two triangles, one draw, the default material. */
function square(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 3, 0, 3, 2]),
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

function selectionView(): SelectionView {
  return {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

describe("Tileset3D.retainGeometry", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => square());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function loaded(retainGeometry?: boolean) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const world = engine.createWorld();
    const tileset = await Tileset3D.load(engine, world, URL_, {
      cacheBytes: 0,
      ...(retainGeometry !== undefined && { retainGeometry }),
    });
    const tile = tileset.root;
    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([selectionView()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tile.state).toBe("ready");
    return { tileset, tile, world };
  }

  it("keeps nothing by default", async () => {
    const { tileset, tile } = await loaded();
    expect(tileset.retainGeometry).toBe(false);
    expect(tile.geometry).toBeUndefined();
    tileset.destroy();
  });

  it("keeps each draw's triangles and world matrix, released on unload and destroy", async () => {
    const { tileset, tile, world } = await loaded(true);
    expect(tileset.retainGeometry).toBe(true);
    const [g, ...rest] = tile.geometry!;
    expect(rest).toEqual([]);
    expect(g!.draw).toEqual(tile.placement!.draws[0]);
    expect(Array.from(g!.positions)).toEqual(
      Array.from(square().meshes[0]!.positions),
    );
    expect(Array.from(g!.indices)).toEqual([0, 1, 3, 0, 3, 2]);
    expect(Array.from(g!.matrix)).toEqual(
      Array.from(world.drawMatrix(g!.draw)!),
    );
    // 3D Tiles y-up content, at the root transform's (R, 0, 0).
    expect(g!.matrix[12]).toBe(R);
    const bytes = tile.bytes;
    expect(bytes).toBeGreaterThanOrEqual(
      g!.positions.byteLength + g!.indices.byteLength,
    );

    // A changed modelMatrix moves the retained matrix with the draw.
    const moved = m4.mat4();
    moved[14] = 5;
    tileset.modelMatrix = moved;
    expect(g!.matrix[14]).toBe(5);
    expect(Array.from(g!.matrix)).toEqual(
      Array.from(world.drawMatrix(g!.draw)!),
    );

    // Unloaded over a zero budget: the geometry goes with it.
    tileset.update([]);
    expect(tile.state).toBe("unloaded");
    expect(tile.geometry).toBeUndefined();
    expect(world.drawMatrix(g!.draw)).toBeUndefined();

    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([selectionView()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tile.geometry).toHaveLength(1);
    tileset.destroy();
    expect(tile.geometry).toBeUndefined();
  });
});
