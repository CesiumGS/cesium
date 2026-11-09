// 3D Tiles 1.0's and 1.1's spellings in a tileset's JSON, read alike.
import { describe, expect, it } from "vitest";
import { treeFromJson, type TileJson } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import {
  MAX_UNDRAWN_REASONS,
  undrawnKind,
} from "../src/streaming/tilesetLoad.ts";

const BOX = { box: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] };

function read(root: TileJson, top: TileJson = {}) {
  const warnings = new Set<string>();
  const tree = treeFromJson(
    { asset: { version: "1.0" }, geometricError: 1, ...top, root },
    "https://tiles.test/tileset.json",
    undefined,
    { warnings } as never,
  );
  return { root: tree.root, warnings: [...warnings] };
}

describe("a tileset's JSON, 1.0 and 1.1", () => {
  const tile = { boundingVolume: BOX, geometricError: 0 };

  it("reads 1.0's content.url and 1.1's content.uri", () => {
    for (const content of [{ url: "a.b3dm" }, { uri: "a.b3dm" }]) {
      const { root } = read({ ...tile, content });
      expect(root.contentUrl).toBe("https://tiles.test/a.b3dm");
    }
  });

  it("takes an external tileset as structure, in either spelling", () => {
    for (const content of [{ url: "b.json" }, { uri: "b.json?v=1" }]) {
      expect(read({ ...tile, content }).root.external).toBe(true);
    }
  });

  it("reads refine in either case, and inherits it", () => {
    const { root } = read({
      ...tile,
      refine: "add",
      children: [{ ...tile }, { ...tile, refine: "REPLACE" }],
    });
    expect(root.refine).toBe("ADD");
    expect(root.children.map((c) => c.refine)).toEqual(["ADD", "REPLACE"]);
  });

  it("draws the first of 1.1's contents, and says so", () => {
    const { root, warnings } = read({
      ...tile,
      contents: [{ uri: "a.glb" }, { uri: "b.glb" }],
    });
    expect(root.contentUrl).toBe("https://tiles.test/a.glb");
    expect(warnings.join()).toMatch(/only the first is drawn/);
  });

  it.each(["contents", "content"])(
    "draws the first of 1.0's 3DTILES_multiple_contents.%s, and says so",
    (key) => {
      const { root, warnings } = read({
        ...tile,
        extensions: {
          "3DTILES_multiple_contents": {
            [key]: [{ uri: "a.b3dm" }, { uri: "b.b3dm" }],
          },
        },
      });
      expect(root.contentUrl).toBe("https://tiles.test/a.b3dm");
      expect(warnings.join()).toMatch(/only the first is drawn/);
    },
  );

  it.each<[string, TileJson]>([
    ["1.1", { implicitTiling: { subdivisionScheme: "QUADTREE" } }],
    [
      "1.0's extension",
      {
        extensions: {
          "3DTILES_implicit_tiling": { subdivisionScheme: "QUADTREE" },
        },
      },
    ],
  ])(
    "doesn't request an implicit tile's template (%s), and says so",
    (_name, implicit) => {
      const { root, warnings } = read({
        ...tile,
        ...implicit,
        content: { uri: "content/{level}/{x}/{y}.glb" },
      });
      expect(root.contentUrl).toBeUndefined();
      expect(root.state).toBe("ready");
      expect(warnings.join()).toMatch(/implicit tiling not supported/);
    },
  );

  it("names a required extension it doesn't read, and not those it does", () => {
    const { warnings } = read(tile, {
      extensionsRequired: ["3DTILES_content_gltf", "3DTILES_metadata"],
    });
    expect(warnings).toEqual([
      "required extension 3DTILES_metadata is not supported",
    ]);
  });

  it("says nothing of a gltfUpAxis it applies, and names one that isn't an axis", () => {
    for (const up of ["X", "Y", "Z", "z"]) {
      expect(read(tile, { asset: { gltfUpAxis: up } }).warnings).toEqual([]);
    }
    expect(read(tile, { asset: { gltfUpAxis: "W" } }).warnings).toEqual([
      "gltfUpAxis W is not an axis (treated as Y)",
    ]);
  });
});

describe("tiles that draw nothing", () => {
  /** What `Tileset3D.undrawnTile` touches, without a tileset. */
  function counter() {
    const state = {
      stats: { undrawn: 0 },
      undrawnReasons: new Map<string, number>(),
      warnings: new Set<string>(),
    };
    const add = (reason: string) =>
      Tileset3D.prototype.undrawnTile.call(state as never, reason);
    return { state, add };
  }

  it("takes the tile's URL out of a reason", () => {
    expect(
      undrawnKind(
        "content failed: Failed to fetch https://tiles.test/a/b123.b3dm?token=x: 503",
      ),
    ).toBe("content failed: Failed to fetch <url>: 503");
    expect(
      undrawnKind(
        "content failed: composite inner tile 17: Failed to fetch https://t.test/g.gltf: 404",
      ),
    ).toBe("content failed: composite inner tile: Failed to fetch <url>: 404");
  });

  it("groups tiles by reason, and counts each", () => {
    const { state, add } = counter();
    for (let i = 0; i < 369; i++) {
      add(`content failed: Failed to fetch https://tiles.test/t${i}.cmpt: 503`);
    }
    expect(state.stats.undrawn).toBe(369);
    expect([...state.undrawnReasons]).toEqual([
      ["content failed: Failed to fetch <url>: 503", 369],
    ]);
    expect(state.warnings.size).toBe(1);
  });

  it("keeps at most a few reasons, and still counts the tiles", () => {
    const { state, add } = counter();
    for (let i = 0; i < MAX_UNDRAWN_REASONS + 30; i++) {
      add(`kind ${i} of trouble`);
    }
    expect(state.undrawnReasons.size).toBe(MAX_UNDRAWN_REASONS);
    expect(state.warnings.size).toBe(MAX_UNDRAWN_REASONS);
    expect(state.stats.undrawn).toBe(MAX_UNDRAWN_REASONS + 30);
    add("kind 0 of trouble");
    expect(state.undrawnReasons.get("kind 0 of trouble")).toBe(2);
  });

  it("counts an implicit tile", () => {
    const reasons: string[] = [];
    const warnings = new Set<string>();
    treeFromJson(
      {
        asset: { version: "1.1" },
        geometricError: 1,
        root: {
          boundingVolume: BOX,
          geometricError: 0,
          implicitTiling: { subdivisionScheme: "QUADTREE" },
          content: { uri: "t/{level}.glb" },
        },
      },
      "https://tiles.test/tileset.json",
      undefined,
      { warnings, undrawnTile: (r: string) => reasons.push(r) } as never,
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/implicit tiling not supported/);
  });
});
