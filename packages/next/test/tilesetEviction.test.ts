// Tileset3D's eviction walks its incremental order (TouchOrder) instead of
// sorting every loaded tile each frame. Through the real tileset (the fake
// engine of test/fakeGpu.ts, as test/tilesetPlacement.test.ts), scripted
// selections under pool pressure and over the byte budget must evict what
// the old sort would have: before each eviction the old candidates are
// computed from the loaded set, and the tiles unloaded are compared.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { type TilesetOptions } from "../src/streaming/tilesetTypes.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const BASE = "https://tiles.test/row/";
const URL_ = `${BASE}tileset.json`;
const CHILDREN = 24;
/** Metres between the children, along y. */
const SPACING = 30;

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

/** A root without content over a row of leaves along y, added (ADD). */
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

/**
 * A view 1 km above the row, looking down, culled to the children between
 * `from` and `to` (child indices) by two planes across y.
 */
function view(from: number, to: number): SelectionView {
  const y0 = (from - CHILDREN / 2) * SPACING - SPACING / 2;
  const y1 = (to - CHILDREN / 2) * SPACING + SPACING / 2;
  return {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array([0, 1, 0, -y0, 0, -1, 0, y1]),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

/** The tileset's internals the comparison reads. */

/** The old policy's candidates: every loaded tile, sorted each frame. */
function oldCandidates(t: Tileset3D, frame: number): Tile[] {
  return [...t.state.loaded]
    .filter((x) => x.touchedFrame < frame)
    .sort((a, b) => a.touchedFrame - b.touchedFrame);
}

describe("Tileset3D eviction: the same tiles as the old sort", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
    // Even children arrive a few frames late, so tiles load out of the
    // order the selection walks (touches) them: ties within a frame then
    // tell load order from touch order.
    vi.spyOn(engine, "loadGltf").mockImplementation(async (url) => {
      const i = Number(/tile(\d+)/.exec(String(url))?.[1] ?? 0);
      if (i % 2 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return triangle();
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function load(options: TilesetOptions) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(tilesetJson()), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    return Tileset3D.load(engine, engine.createWorld(), URL_, options);
  }

  /**
   * The whole row, then a jump to its start (the rest go stale together,
   * one tie group), a window drifting along, and the whole row again.
   */
  function windowAt(frame: number): [number, number] {
    if (frame < 30) {
      return [0, CHILDREN - 1];
    }
    if (frame < 50) {
      return [0, 5];
    }
    if (frame < 90) {
      const at = Math.floor((frame - 50) / 2) % (CHILDREN - 6);
      return [at, at + 5];
    }
    return [0, CHILDREN - 1];
  }

  let onFrame: (frame: number) => void = () => {};
  /** Runs frames, letting loads resolve between them. */
  async function run(tileset: Tileset3D, frames: number) {
    for (let frame = 0; frame < frames; frame++) {
      const [from, to] = windowAt(frame);
      onFrame(frame);
      tileset.update([view(from, to)]);
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  it("under pool pressure (evictForCapacity)", async () => {
    const tileset = await load({ uploadsPerFrame: 3 });
    const t = tileset;
    // After the row has loaded, the world near a pool's ceiling on two
    // frames of three, as when the cache hovers at 90%.
    let frame = 0;
    vi.spyOn(tileset.world, "pressure").mockImplementation(() => ({
      fraction: frame >= 30 && frame % 3 !== 2 ? 0.95 : 0.5,
      pool: "transform table",
    }));
    const original = t.evictForCapacity.bind(t);
    let evictions = 0;
    t.evictForCapacity = (f: number) => {
      const expected = oldCandidates(t, f).slice(0, t.state.uploadsPerFrame);
      const before = [...t.state.loaded];
      original(f);
      const gone = before.filter((x) => !t.state.loaded.has(x));
      expect(gone).toEqual(expected);
      evictions += gone.length;
    };
    onFrame = (f) => (frame = f);
    await run(tileset, 100);
    onFrame = () => {};
    expect(evictions).toBeGreaterThan(10);
    // What stays: the last (wide) view's tiles, and nothing it didn't touch.
    for (const tile of t.state.loaded) {
      expect(tile.touchedFrame).toBeGreaterThan(0);
    }
    tileset.destroy();
  });

  it("over the byte budget (evict)", async () => {
    const tileset = await load({ uploadsPerFrame: 4 });
    const t = tileset;
    // A budget of about four tiles, no overflow: eviction runs most frames.
    let perTile = 0;
    const original = t.evict.bind(t);
    let evictions = 0;
    t.evict = (f: number) => {
      const first = [...t.state.loaded][0];
      if (perTile === 0 && first) {
        perTile = first.bytes;
        t.state.cacheBytes = 4 * perTile;
        t.state.overflowBytes = 0;
      }
      // The old loop, replayed on the candidates the old sort gave.
      const expected: Tile[] = [];
      if (t.stats.bytes > t.state.cacheBytes) {
        let bytes = t.stats.bytes;
        let allowance = Math.max(
          2 * t.engine.uploadBytesPerFrame,
          bytes - (t.state.cacheBytes + t.state.overflowBytes),
        );
        for (const tile of oldCandidates(t, f)) {
          if (bytes <= t.state.cacheBytes || allowance <= 0) {
            break;
          }
          allowance -= tile.bytes;
          bytes -= tile.bytes;
          expected.push(tile);
        }
      }
      const before = [...t.state.loaded];
      original(f);
      const gone = before.filter((x) => !t.state.loaded.has(x));
      expect(gone).toEqual(expected);
      evictions += gone.length;
    };
    await run(tileset, 100);
    expect(evictions).toBeGreaterThan(10);
    tileset.destroy();
  });

  it("counts a fixed overhead per tile against the budget", async () => {
    const tileset = await load({});
    const t = tileset;
    await run(tileset, 10);
    const tile = [...t.state.loaded][0]!;
    const content = tile.placement!.model.bytes;
    // About 3 KB for a one-draw tile: the table rows and heap objects.
    expect(tile.bytes - content).toBeGreaterThan(2_000);
    expect(tile.bytes - content).toBeLessThan(4_000);
    expect(t.stats.bytes).toBe(
      [...t.state.loaded].reduce((n, x) => n + x.bytes, 0),
    );
    tileset.destroy();
  });
});
