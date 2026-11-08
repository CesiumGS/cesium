// Composite (cmpt) tiles: one tile's content made of several inner tiles,
// each with its own RTC center, batch table and instances. Before this, a
// cmpt tile was "unsupported" and drew nothing while it still counted as
// selected: 369 of the 1054 tiles of the BIM design model (ion 2464651).
import { readFileSync } from "node:fs";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../src/io/decoders.ts", () => ({
  decodeDraco: async () => {
    throw new Error("no Draco");
  },
  transcodeKtx2: async () => {
    throw new Error("no KTX2");
  },
}));

import {
  CompositeFormatError,
  isComposite,
  MAX_COMPOSITE_DEPTH,
  MAX_COMPOSITE_TILES,
  mergeAssets,
  splitComposite,
} from "../src/io/composite.ts";
import { parseGltf } from "../src/io/gltfParse.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import { summarizeContent } from "../src/streaming/pipeline.ts";
import { OffscreenTarget } from "../src/scene/View.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

const data = new URL("../../../Specs/Data/Cesium3DTiles/", import.meta.url);
const specs = (path: string) =>
  new Uint8Array(readFileSync(new URL(path, data)));

/** A tile of `magic` whose bytes after the 12-byte header are `body`. */
function inner(magic: string, body = new Uint8Array(4)): Uint8Array {
  const out = new Uint8Array(12 + body.byteLength);
  out.set(new TextEncoder().encode(magic));
  const view = new DataView(out.buffer);
  view.setUint32(4, 1, true);
  view.setUint32(8, out.byteLength, true);
  out.set(body, 12);
  return out;
}

/** A composite of these inner tiles, its header fields overridable. */
function composite(
  tiles: Uint8Array[],
  header: { version?: number; byteLength?: number; tilesLength?: number } = {},
): Uint8Array {
  const length = tiles.reduce((n, t) => n + t.byteLength, 16);
  const out = new Uint8Array(length);
  out.set(new TextEncoder().encode("cmpt"));
  const view = new DataView(out.buffer);
  view.setUint32(4, header.version ?? 1, true);
  view.setUint32(8, header.byteLength ?? length, true);
  view.setUint32(12, header.tilesLength ?? tiles.length, true);
  let offset = 16;
  for (const tile of tiles) {
    out.set(tile, offset);
    offset += tile.byteLength;
  }
  return out;
}

function dataUrl(bytes: Uint8Array): string {
  return `data:application/octet-stream;base64,${Buffer.from(bytes).toString("base64")}`;
}

const magicOf = (bytes: Uint8Array) =>
  String.fromCharCode(...bytes.subarray(0, 4));

describe("splitComposite", () => {
  it("recognizes a composite by its magic", () => {
    expect(isComposite(composite([]))).toBe(true);
    expect(isComposite(inner("b3dm"))).toBe(false);
    expect(isComposite(new Uint8Array(2))).toBe(false);
  });

  it("returns each inner tile's own bytes, in order", () => {
    const warnings: string[] = [];
    const tiles = splitComposite(
      composite([
        inner("b3dm", new Uint8Array([1, 2, 3, 4])),
        inner("i3dm", new Uint8Array([5, 6, 7, 8])),
      ]),
      warnings,
    );
    expect(tiles.map(magicOf)).toEqual(["b3dm", "i3dm"]);
    expect(tiles[0]!.byteLength).toBe(16);
    expect(tiles[1]![12]).toBe(5);
    expect(warnings).toEqual([]);
  });

  it("walks nested composites", () => {
    const tiles = splitComposite(
      composite([
        inner("b3dm"),
        composite([inner("i3dm"), composite([inner("b3dm")])]),
      ]),
      [],
    );
    expect(tiles.map(magicOf)).toEqual(["b3dm", "i3dm", "b3dm"]);
  });

  it("gives every inner tile 8-byte-aligned bytes", () => {
    const short = inner("b3dm", new Uint8Array(5)); // 17 bytes: the next is odd
    const tiles = splitComposite(composite([short, inner("i3dm")]), []);
    for (const tile of tiles) {
      expect(tile.byteOffset % 8).toBe(0);
    }
  });

  it("reads the real test data", () => {
    const warnings: string[] = [];
    expect(
      splitComposite(specs("Composite/Composite/composite.cmpt"), warnings).map(
        magicOf,
      ),
    ).toEqual(["b3dm", "i3dm"]);
    expect(
      splitComposite(
        specs("Composite/CompositeOfComposite/compositeOfComposite.cmpt"),
        warnings,
      ).map(magicOf),
    ).toEqual(["b3dm", "i3dm"]);
    expect(warnings).toEqual([]);
  });

  it.each(["pnts", "vctr", "geom"])(
    "skips an inner %s with one clear warning, however many there are",
    (magic) => {
      const warnings: string[] = [];
      const tiles = splitComposite(
        composite([inner(magic), inner("b3dm"), inner(magic)]),
        warnings,
      );
      expect(tiles.map(magicOf)).toEqual(["b3dm"]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(magic);
      expect(warnings[0]).toMatch(/skipped/);
    },
  );

  it("says point clouds are deferred", () => {
    const warnings: string[] = [];
    splitComposite(composite([inner("pnts")]), warnings);
    expect(warnings[0]).toMatch(/point clouds?.*deferred/i);
  });

  it.each<[string, () => Uint8Array, RegExp]>([
    ["a short header", () => composite([]).subarray(0, 10), /header/],
    ["another version", () => composite([], { version: 2 }), /version 2/],
    [
      "a byteLength past the bytes",
      () => composite([inner("b3dm")], { byteLength: 1 << 20 }),
      /byteLength/,
    ],
    [
      "a byteLength shorter than its header",
      () => composite([], { byteLength: 4 }),
      /byteLength/,
    ],
    [
      "more inner tiles than fit",
      () => composite([inner("b3dm")], { tilesLength: 0x7fffffff }),
      /tilesLength/,
    ],
    [
      "an inner tile past the composite's end",
      () => {
        const tile = inner("b3dm");
        new DataView(tile.buffer).setUint32(8, 1 << 20, true);
        return composite([tile]);
      },
      /inner tile 0/,
    ],
    [
      "an inner tile of zero length, which would never advance",
      () => {
        const tile = inner("b3dm");
        new DataView(tile.buffer).setUint32(8, 0, true);
        return composite([tile]);
      },
      /inner tile 0/,
    ],
    [
      "an unknown inner format",
      () => composite([inner("abcd")]),
      /inner tile 0.*"abcd"/,
    ],
  ])("refuses %s with a named error", (_name, build, message) => {
    let error: unknown;
    try {
      splitComposite(build(), []);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CompositeFormatError);
    expect((error as Error).name).toBe("CompositeFormatError");
    expect((error as Error).message).toMatch(message);
  });

  it("bounds the nesting depth", () => {
    let bytes = composite([inner("b3dm")]);
    for (let i = 0; i <= MAX_COMPOSITE_DEPTH; i++) {
      expect(splitComposite(bytes, []).map(magicOf)).toEqual(["b3dm"]);
      bytes = composite([bytes]);
    }
    expect(() => splitComposite(bytes, [])).toThrow(CompositeFormatError);
    expect(() => splitComposite(bytes, [])).toThrow(/nest/);
  });

  it("bounds the inner tiles of the whole tree", () => {
    const many = Array.from({ length: MAX_COMPOSITE_TILES + 1 }, () =>
      inner("b3dm"),
    );
    expect(() => splitComposite(composite(many), [])).toThrow(/inner tiles/);
  });
});

/** A part with one mesh, drawn once, with a feature table and a texture. */
function part(options: {
  rtcCenter?: [number, number, number];
  instances?: GltfAsset["instances"];
  table?: boolean;
}): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        ...(options.table
          ? { featureIds: new Uint32Array(3), featureTable: 0, featureCount: 1 }
          : {}),
      },
    ],
    materials: [
      {
        baseColor: [1, 1, 1, 1],
        metallic: 0,
        roughness: 1,
        emissive: [0, 0, 0],
        alphaMode: "OPAQUE",
        alphaCutoff: 0.5,
        doubleSided: false,
        unlit: false,
        normalScale: 1,
        occlusionStrength: 1,
      },
    ],
    textures: [],
    images: [],
    draws: [
      {
        mesh: 0,
        material: 0,
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    ],
    featureTables: options.table
      ? [{ count: 1, columns: { name: ["a"] } }]
      : [],
    ...(options.rtcCenter ? { rtcCenter: options.rtcCenter } : {}),
    ...(options.instances ? { instances: options.instances } : {}),
    warnings: [],
  };
}

/** `n` translations along x, 16 numbers each. */
function translations(...xs: number[]): Float64Array {
  const out = new Float64Array(xs.length * 16);
  xs.forEach((x, i) => {
    out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1], i * 16);
  });
  return out;
}

describe("mergeAssets", () => {
  it("keeps one part as it is", () => {
    const only = part({ rtcCenter: [1, 2, 3] });
    const merged = mergeAssets([only]);
    expect(merged.rtcCenter).toEqual([1, 2, 3]);
    expect(merged.parts).toBeUndefined();
  });

  it("offsets every index into the merged lists", () => {
    const textured = part({ table: true });
    textured.images = [{} as never];
    textured.textures = [{ image: 0, sampler: {} as never }];
    textured.materials[0]!.baseColorTexture = 0;
    textured.materials[0]!.normalTexture = 0;
    textured.meshes[0]!.propertyTextures = [{ texture: 0 } as never];
    const merged = mergeAssets([part({ table: true }), textured]);
    expect(merged.meshes).toHaveLength(2);
    expect(merged.materials).toHaveLength(2);
    expect(merged.draws.map((d) => [d.mesh, d.material, d.part])).toEqual([
      [0, 0, 0],
      [1, 1, 1],
    ]);
    expect(merged.meshes.map((m) => m.featureTable)).toEqual([0, 1]);
    expect(merged.featureTables).toHaveLength(2);
    expect(merged.textures[0]!.image).toBe(0);
    expect(merged.materials[1]!.baseColorTexture).toBe(0);
    expect(merged.meshes[1]!.propertyTextures![0]!.texture).toBe(0);
  });

  it("offsets textures and images past the earlier parts'", () => {
    const textured = () => {
      const p = part({});
      p.images = [{} as never];
      p.textures = [{ image: 0, sampler: {} as never }];
      p.materials[0]!.baseColorTexture = 0;
      p.meshes[0]!.propertyTextures = [{ texture: 0 } as never];
      return p;
    };
    const merged = mergeAssets([textured(), textured()]);
    expect(merged.images).toHaveLength(2);
    expect(merged.textures.map((t) => t.image)).toEqual([0, 1]);
    expect(merged.materials[1]!.baseColorTexture).toBe(1);
    expect(merged.meshes[1]!.propertyTextures![0]!.texture).toBe(1);
  });

  it("leaves the default material alone", () => {
    const plain = part({});
    plain.draws[0]!.material = -1;
    const merged = mergeAssets([part({}), plain]);
    expect(merged.draws[1]!.material).toBe(-1);
  });

  it("keeps each part's RTC center and instances, and gives instances their batch table", () => {
    const instances = {
      matrices: translations(1, 2),
      origin: [5, 0, 0] as [number, number, number],
      featureIds: new Uint32Array([0, 1]),
    };
    const merged = mergeAssets([
      part({ rtcCenter: [1, 2, 3], table: true }),
      {
        ...part({ instances }),
        featureTables: [{ count: 2, columns: { name: ["x", "y"] } }],
      },
    ]);
    expect(merged.rtcCenter).toBeUndefined();
    expect(merged.instances).toBeUndefined();
    expect(merged.parts).toEqual([{ rtcCenter: [1, 2, 3] }, { instances }]);
    // As a lone i3dm's meshes read its first table.
    expect(merged.meshes[1]!.featureTable).toBe(1);
  });

  it("gives lights their parts, and joins warnings and credits", () => {
    const a = part({ rtcCenter: [1, 0, 0] });
    a.warnings = ["one"];
    a.copyright = "A";
    const b = part({ rtcCenter: [2, 0, 0] });
    b.warnings = ["one", "two"];
    b.copyright = "A";
    b.lights = [
      {
        type: "point",
        color: [1, 1, 1],
        intensity: 1,
        matrix: new Float64Array(16),
      },
    ];
    const c = part({ rtcCenter: [3, 0, 0] });
    c.copyright = "C";
    const merged = mergeAssets([a, b, c]);
    expect(merged.warnings).toEqual(["one", "two"]);
    expect(merged.copyright).toBe("A; C");
    expect(merged.lights![0]!.part).toBe(1);
  });
});

/** An i3dm of one instance whose glTF is fetched from `uri`. */
function i3dmByUri(uri: string): Uint8Array {
  const json = new TextEncoder().encode(
    JSON.stringify({ INSTANCES_LENGTH: 1, POSITION: { byteOffset: 0 } }),
  );
  const bin = new Uint8Array(12);
  const body = new TextEncoder().encode(uri);
  const out = new Uint8Array(32 + json.length + bin.length + body.length);
  out.set(new TextEncoder().encode("i3dm"));
  const view = new DataView(out.buffer);
  view.setUint32(4, 1, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, json.length, true);
  view.setUint32(16, bin.length, true);
  out.set(json, 32);
  out.set(body, 32 + json.length + bin.length);
  return out;
}

describe("parseGltf on composites", () => {
  const textures = {
    bc7: false,
    astc: false,
    etc2: false,
  } as unknown as Parameters<typeof parseGltf>[1];

  it("parses a b3dm and an i3dm into one asset of two parts", async () => {
    const { asset, transfer } = await parseGltf(
      dataUrl(specs("Composite/Composite/composite.cmpt")),
      textures,
    );
    expect(asset.parts).toHaveLength(2);
    expect(asset.parts![0]!.rtcCenter).toBeDefined();
    expect(asset.parts![1]!.instances).toBeDefined();
    expect(new Set(asset.draws.map((d) => d.part))).toEqual(new Set([0, 1]));
    expect(asset.featureTables.length).toBeGreaterThanOrEqual(2);
    expect(asset.timing!.format).toBe("cmpt");
    expect(summarizeContent(asset).format).toBe("cmpt");
    // Transferring one buffer twice is a DataCloneError.
    expect(new Set(transfer).size).toBe(transfer.length);
    expect(() => structuredClone(asset, { transfer })).not.toThrow();
  });

  it("keeps the composite's network timing, with more than one part", async () => {
    const { asset } = await parseGltf(
      dataUrl(specs("Composite/Composite/composite.cmpt")),
      textures,
    );
    expect(asset.parts).toHaveLength(2);
    expect(asset.timing!.networkMs).toBeGreaterThanOrEqual(0);
    expect(typeof asset.timing!.networkMs).toBe("number");
    expect(asset.timing!.bytes).toBe(
      specs("Composite/Composite/composite.cmpt").byteLength,
    );
  });

  describe("many inner tiles", () => {
    const GLTF = JSON.stringify({ asset: { version: "2.0" } });
    let started: string[];
    let inFlight: number;
    let peak: number;

    beforeEach(() => {
      started = [];
      inFlight = 0;
      peak = 0;
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** Fetches of the inner tiles' glTFs: each answers after a tick. */
    function stubFetch(fail: (uri: string) => boolean = () => false) {
      const realFetch = globalThis.fetch;
      vi.stubGlobal("fetch", async (input: string | URL) => {
        const uri = String(input);
        if (!uri.startsWith("https://tiles.test/g")) {
          return realFetch(input);
        }
        started.push(uri);
        peak = Math.max(peak, ++inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight--;
        return fail(uri)
          ? new Response("gone", { status: 404 })
          : new Response(GLTF);
      });
    }

    const many = (n: number) =>
      composite(
        Array.from({ length: n }, (_, i) =>
          i3dmByUri(`https://tiles.test/g${i}.gltf`),
        ),
      );

    it("parses a few at a time", async () => {
      stubFetch();
      const { asset } = await parseGltf(
        dataUrl(many(MAX_COMPOSITE_TILES)),
        textures,
      );
      expect(asset.parts).toHaveLength(MAX_COMPOSITE_TILES);
      expect(started).toHaveLength(MAX_COMPOSITE_TILES);
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(4);
    });

    it("stops at the first failure, and names it", async () => {
      stubFetch((uri) => uri.endsWith("/g1.gltf"));
      await expect(parseGltf(dataUrl(many(40)), textures)).rejects.toThrow(
        /composite inner tile 1: .*404/,
      );
      // Only the first batch started; the other 36 never did.
      expect(started.length).toBeLessThanOrEqual(4);
    });
  });

  it("gives each part's draws their own batch table", async () => {
    const { asset } = await parseGltf(
      dataUrl(specs("Composite/Composite/composite.cmpt")),
      textures,
    );
    const columnsOf = (part: number) => {
      const draw = asset.draws.find((d) => d.part === part)!;
      const table = asset.meshes[draw.mesh]!.featureTable!;
      return Object.keys(asset.featureTables[table]!.columns);
    };
    // As the lone BatchedWithBatchTable and InstancedWithBatchTable.
    expect(columnsOf(0)).toContain("id");
    expect(columnsOf(1)).toEqual(["Height"]);
  });

  it("parses a composite of composites alike", async () => {
    const { asset } = await parseGltf(
      dataUrl(
        specs("Composite/CompositeOfComposite/compositeOfComposite.cmpt"),
      ),
      textures,
    );
    expect(asset.parts).toHaveLength(2);
    expect(asset.timing!.format).toBe("cmpt");
  });

  it("fails the content with the named error on malformed lengths", async () => {
    await expect(
      parseGltf(dataUrl(composite([], { version: 7 })), textures),
    ).rejects.toThrow(/malformed composite tile: version 7/);
  });

  it("calls a composite with nothing to draw unsupported, saying why", async () => {
    await expect(
      parseGltf(dataUrl(composite([inner("pnts")])), textures),
    ).rejects.toThrow(/unsupported tile format: cmpt.*pnts/);
  });

  it("keeps a skipped part's warning on the asset", async () => {
    const real = specs("Composite/Composite/composite.cmpt");
    const { asset } = await parseGltf(
      dataUrl(composite([real, inner("pnts")])),
      textures,
    );
    expect(asset.parts).toHaveLength(2);
    expect(asset.warnings.join()).toMatch(/pnts/);
  });

  it.each(["pnts", "vctr", "geom"])(
    "says %s alone is unsupported, as before",
    async (magic) => {
      await expect(parseGltf(dataUrl(inner(magic)), textures)).rejects.toThrow(
        new RegExp(`unsupported tile format: ${magic}`),
      );
    },
  );

  it("refuses an i3dm whose INSTANCES_LENGTH can't fit its feature table", async () => {
    const json = new TextEncoder().encode(
      JSON.stringify({
        INSTANCES_LENGTH: 0x7fffffff,
        POSITION: { byteOffset: 0 },
      }),
    );
    const out = new Uint8Array(32 + json.byteLength);
    out.set(new TextEncoder().encode("i3dm"));
    const view = new DataView(out.buffer);
    view.setUint32(4, 1, true);
    view.setUint32(8, out.byteLength, true);
    view.setUint32(12, json.byteLength, true);
    view.setUint32(28, 1, true);
    out.set(json, 32);
    await expect(parseGltf(dataUrl(out), textures)).rejects.toThrow(
      /INSTANCES_LENGTH/,
    );
  });
});

describe("a composite placed as one tile's content", () => {
  const X = 6378137;
  const at = {
    modelMatrix: new Float64Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      X,
      0,
      0,
      1,
    ]),
  };
  let engine: Engine;
  let world: World;

  beforeAll(async () => {
    installGpuGlobals();
    installFakeNavigator(fakeDevice({}));
    const { Engine } = await import("../src/scene/Engine.ts");
    engine = await Engine.create({ limits: "adapter" });
    world = engine.createWorld();
  });

  const instances = {
    matrices: translations(-1, 1),
    origin: [0, 100, 0] as [number, number, number],
    featureIds: new Uint32Array([0, 1]),
  };

  it("draws each part at its own RTC center", () => {
    using model = engine.uploadModel(
      world,
      mergeAssets([
        part({ rtcCenter: [10, 0, 0] }),
        part({ rtcCenter: [0, 20, 0] }),
      ]),
      { axes: "3d-tiles" },
    );
    const placement = model.place(at);
    const [a, b] = placement.draws.map((d) => world.drawMatrix(d)!);
    expect([a![12], a![13]]).toEqual([X + 10, 0]);
    expect([b![12], b![13]]).toEqual([X, 20]);
    placement.remove();
  });

  it("matches a lone b3dm's and a lone i3dm's placement, part by part", () => {
    const lone = (asset: GltfAsset) => {
      using model = engine.uploadModel(world, asset, { axes: "3d-tiles" });
      const placement = model.place(at);
      const matrix = world.drawMatrix(placement.draws[0]!)!;
      placement.remove();
      return matrix;
    };
    using model = engine.uploadModel(
      world,
      mergeAssets([part({ rtcCenter: [10, 0, 0] }), part({ instances })]),
      { axes: "3d-tiles" },
    );
    const placement = model.place(at);
    const [b3dm, i3dm] = placement.draws.map((d) => world.drawMatrix(d)!);
    expect(b3dm).toEqual(lone(part({ rtcCenter: [10, 0, 0] })));
    expect(i3dm).toEqual(lone(part({ instances })));
    placement.remove();
  });

  it("instances only the instanced part's draws", () => {
    using model = engine.uploadModel(
      world,
      mergeAssets([part({ rtcCenter: [10, 0, 0] }), part({ instances })]),
    );
    const before = world.memory.instances.used;
    const placement = model.place(at);
    expect(world.memory.instances.used - before).toBe(2);
    placement.remove();
    expect(world.memory.instances.used).toBe(before);
  });

  it("bounds every part, instances included", () => {
    using model = engine.uploadModel(
      world,
      mergeAssets([part({ rtcCenter: [10, 0, 0] }), part({ instances })]),
      { axes: "3d-tiles" },
    );
    const placement = model.place(at);
    const { center, radius } = placement.bounds();
    // The b3dm is near (X + 10, 0, 0), the i3dm near (X, 100, 0).
    for (const point of [
      [X + 10, 0, 0],
      [X, 100, 0],
    ]) {
      expect(
        Math.hypot(
          point[0]! - center[0]!,
          point[1]! - center[1]!,
          point[2]! - center[2]!,
        ),
      ).toBeLessThanOrEqual(radius);
    }
    placement.remove();
  });

  it("has no instance to change in a composite: the parts differ", () => {
    using model = engine.uploadModel(
      world,
      mergeAssets([part({ rtcCenter: [10, 0, 0] }), part({ instances })]),
    );
    const placement = model.place(at);
    expect(() => placement.setInstance(0, { visible: false })).toThrow(
      RangeError,
    );
    placement.remove();
  });

  it("frees everything with its one placement", () => {
    const transforms = world.memory.transforms.used;
    const before = world.arenaBytes;
    const model = engine.uploadModel(
      world,
      mergeAssets([part({ rtcCenter: [10, 0, 0] }), part({ instances })]),
    );
    const placement = model.place(at);
    model.release();
    expect(model.bytes).toBeGreaterThan(0);
    placement.remove();
    expect(model.freed).toBe(true);
    expect(world.memory.transforms.used).toBe(transforms);
    expect(world.arenaBytes).toBeLessThanOrEqual(before);
  });

  it.each<[string, string, string]>([
    [
      "unsupported",
      "unsupported tile format: pnts (point clouds are deferred until the vector renderer)",
      "point clouds are deferred",
    ],
    ["failed", "malformed composite tile: version 7, not 1", "content failed"],
  ])(
    "counts a tile whose content is %s, says why, and still settles",
    async (_name, message, reason) => {
      vi.spyOn(engine, "loadGltf").mockRejectedValue(new Error(message));
      vi.stubGlobal(
        "fetch",
        async () =>
          new Response(
            JSON.stringify({
              asset: { version: "1.0" },
              geometricError: 100,
              root: {
                geometricError: 0,
                refine: "REPLACE",
                transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, X, 0, 0, 1],
                boundingVolume: {
                  box: [0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 200],
                },
                content: { uri: "tile.pnts" },
              },
            }),
          ),
      );
      const view = engine.addView({
        target: new OffscreenTarget(640, 360),
        world,
        exposure: { ev100: 15 },
      });
      view.camera.lookAt(new Float64Array([X, 0, 0]), 0, -Math.PI / 2, 300);
      const tileset = await engine.addTileset(
        world,
        "https://tiles.test/b/tileset.json",
      );
      try {
        for (let i = 0; i < 20 && tileset.stats.undrawn === 0; i++) {
          engine.renderFrame();
          await new Promise((resolve) => setImmediate(resolve));
        }
        engine.renderFrame();
        expect(tileset.stats.undrawn).toBe(1);
        expect([...tileset.undrawnReasons.keys()].join()).toContain(reason);
        expect([...tileset.warnings].join()).toContain(reason);
        expect(tileset.stats.inFlight).toBe(0);
        expect(tileset.idle).toBe(true);
      } finally {
        engine.removeTileset(tileset);
        engine.removeView(view);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
      }
    },
  );

  it.each<[string, number[]]>([
    // Where the content's +x, +y and +z go, as 1.x Axis.
    ["Y", [1, 0, 0, 0, 0, 1, 0, -1, 0]],
    ["Z", [1, 0, 0, 0, 1, 0, 0, 0, 1]],
    ["X", [0, 0, 1, 0, 1, 0, -1, 0, 0]],
  ])("turns content upright by asset.gltfUpAxis %s", async (up, columns) => {
    vi.spyOn(engine, "loadGltf").mockResolvedValue(part({}));
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            asset: { version: "1.0", gltfUpAxis: up },
            geometricError: 100,
            root: {
              geometricError: 0,
              refine: "REPLACE",
              transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, X, 0, 0, 1],
              boundingVolume: {
                box: [0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 200],
              },
              content: { uri: "tile.b3dm" },
            },
          }),
        ),
    );
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world,
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(new Float64Array([X, 0, 0]), 0, -Math.PI / 2, 300);
    const tileset = await engine.addTileset(
      world,
      `https://tiles.test/up${up}/tileset.json`,
    );
    try {
      for (let i = 0; i < 20 && tileset.stats.loaded === 0; i++) {
        engine.renderFrame();
        await new Promise((resolve) => setImmediate(resolve));
      }
      const m = world.drawMatrix(tileset.root.placement!.draws[0]!)!;
      expect([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]).toEqual(
        columns,
      );
    } finally {
      engine.removeTileset(tileset);
      engine.removeView(view);
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("is one tile in a tileset: one placement, one byte count, one unload", async () => {
    const asset = mergeAssets([
      part({ rtcCenter: [10, 0, 0], table: true }),
      part({ instances }),
    ]);
    const tilesetJson = {
      asset: { version: "1.0" },
      geometricError: 100,
      root: {
        geometricError: 0,
        refine: "REPLACE",
        transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, X, 0, 0, 1],
        boundingVolume: { box: [0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 200] },
        content: { uri: "tile.cmpt" },
      },
    };
    vi.spyOn(engine, "loadGltf").mockResolvedValue(asset);
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify(tilesetJson)),
    );
    const view = engine.addView({
      target: new OffscreenTarget(640, 360),
      world,
      exposure: { ev100: 15 },
    });
    view.camera.lookAt(new Float64Array([X, 0, 0]), 0, -Math.PI / 2, 300);
    const tileset = await engine.addTileset(
      world,
      "https://tiles.test/a/tileset.json",
      {
        retainGeometry: true,
      } as never,
    );
    try {
      for (let i = 0; i < 20 && tileset.stats.loaded === 0; i++) {
        engine.renderFrame();
        await new Promise((resolve) => setImmediate(resolve));
      }
      expect(tileset.stats.loaded).toBe(1);
      const tile = tileset.root!;
      expect(tile.placement!.draws).toHaveLength(2);
      expect(tileset.stats.bytes).toBeGreaterThan(0);
      // Draws of both parts find the one tile.
      for (const draw of tile.placement!.draws) {
        expect(tileset.tileOfDraw(draw)).toBe(tile);
      }
      // The instanced part's triangles are not kept, as for a lone i3dm.
      expect(tile.geometry).toHaveLength(1);
      expect([...tileset.warnings]).toEqual([]);
    } finally {
      engine.removeTileset(tileset);
      engine.removeView(view);
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
    expect(tileset.stats.bytes).toBe(0);
  });
});
