// The acceleration-structure lifetime hook (spec section 7.10, plan 5a
// Task 18): a recording hook on the world sees every tile its tilesets
// place and unload, and every draw added and removed, through the real
// tileset on the fake engine (as test/tilesetEviction.test.ts).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import {
  NO_ACCELERATION,
  type AccelerationStructures,
} from "../src/streaming/acceleration.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const URL_ = "https://tiles.test/hook/tileset.json";
const CHILDREN = 8;
const SPACING = 30;

/** Two triangles as two draws: a tile's placement has more than one. */
function asset(): GltfAsset {
  const mesh = {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
  return {
    meshes: [mesh, mesh],
    materials: [],
    textures: [],
    images: [],
    draws: [
      { mesh: 0, material: -1, matrix: m4.mat4() },
      { mesh: 1, material: -1, matrix: m4.mat4() },
    ],
    featureTables: [],
    warnings: [],
  };
}

function tilesetJson() {
  return {
    asset: { version: "1.1" },
    geometricError: 1000,
    root: {
      geometricError: 1000,
      refine: "ADD",
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
      boundingVolume: {
        box: [0, 0, 0, 10, 0, 0, 0, CHILDREN * SPACING, 0, 0, 0, 10],
      },
      children: Array.from({ length: CHILDREN }, (_, i) => ({
        geometricError: 0,
        boundingVolume: {
          box: [0, (i - CHILDREN / 2) * SPACING, 0, 5, 0, 0, 0, 5, 0, 0, 0, 5],
        },
        content: { uri: `tile${i}.gltf` },
      })),
    },
  };
}

function view(): SelectionView {
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

/** Records each event, in order. */
function recorder() {
  const events: string[] = [];
  const placed = new Map<Tile, readonly DrawHandle[]>();
  const unloaded: Tile[] = [];
  const added = new Set<string>();
  const removed = new Set<string>();
  const key = (d: DrawHandle) => `${d.index}:${d.generation}`;
  const hook: AccelerationStructures = {
    tilePlaced: (_tileset, tile, draws) => {
      events.push(`placed ${tile.contentUrl}`);
      placed.set(tile, [...draws]);
    },
    tileUnloaded: (_tileset, tile) => {
      events.push(`unloaded ${tile.contentUrl}`);
      unloaded.push(tile);
    },
    drawAdded: (d) => {
      events.push(`added ${key(d)}`);
      added.add(key(d));
    },
    drawRemoved: (d) => {
      events.push(`removed ${key(d)}`);
      removed.add(key(d));
    },
  };
  return { hook, events, placed, unloaded, added, removed, key };
}

describe("the acceleration-structure hook", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => asset());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is a no-op by default", () => {
    expect(engine.createWorld().acceleration).toBe(NO_ACCELERATION);
  });

  it("sees every draw added and removed by the world", () => {
    const world = engine.createWorld({
      maxDraws: 16,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    const r = recorder();
    world.acceleration = r.hook;
    const mesh = world.addMesh(createBox());
    const a = world.addDraw({ mesh, origin: Float64Array.of(0, 0, 0) });
    const b = world.addDraw({ mesh, origin: Float64Array.of(1, 0, 0) });
    world.removeDraw(a);
    world.removeDraw(a); // already gone: not announced again
    world.removeDraw(b);
    expect(r.events).toEqual([
      `added ${r.key(a)}`,
      `added ${r.key(b)}`,
      `removed ${r.key(a)}`,
      `removed ${r.key(b)}`,
    ]);
  });

  it("sees every tile placed and unloaded, with its draws, on a streamed tileset", async () => {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(tilesetJson()), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const world = engine.createWorld();
    const r = recorder();
    world.acceleration = r.hook;
    const tileset = await Tileset3D.load(engine, world, URL_, {});
    const loaded = tileset.state.loaded;
    for (let tick = 0; tick < 30 && loaded.size < CHILDREN; tick++) {
      tileset.update([view()]);
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    expect(loaded.size).toBe(CHILDREN);
    // Each loaded tile announced once, with its placement's draws, each
    // added before the tile was announced.
    expect([...r.placed.keys()].sort(byUrl)).toEqual([...loaded].sort(byUrl));
    for (const [tile, draws] of r.placed) {
      expect(draws).toEqual(tile.placement!.draws);
      expect(draws).toHaveLength(2);
      const announced = r.events.indexOf(`placed ${tile.contentUrl}`);
      for (const d of draws) {
        expect(r.events.indexOf(`added ${r.key(d)}`)).toBeLessThan(announced);
      }
    }
    const tileDraws = [...r.placed.values()].flat().map(r.key);
    expect(new Set(tileDraws)).toEqual(r.added);

    // Unloading all of it: each tile announced before its draws go.
    tileset.destroy();
    expect([...r.unloaded].sort(byUrl)).toEqual(
      [...r.placed.keys()].sort(byUrl),
    );
    for (const [tile, draws] of r.placed) {
      const announced = r.events.indexOf(`unloaded ${tile.contentUrl}`);
      for (const d of draws) {
        expect(r.events.indexOf(`removed ${r.key(d)}`)).toBeGreaterThan(
          announced,
        );
      }
    }
    expect(r.removed).toEqual(r.added);
  });
});

const byUrl = (a: Tile, b: Tile) =>
  String(a.contentUrl).localeCompare(String(b.contentUrl));
