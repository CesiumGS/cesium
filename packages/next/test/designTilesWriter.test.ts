import { describe, expect, it, vi } from "vitest";

// The Draco and Basis decoders need a browser worker; this content uses neither.
vi.mock("../src/io/decoders.ts", () => ({
  decodeDraco: async () => {
    throw new Error("no Draco");
  },
  transcodeKtx2: async () => {
    throw new Error("no KTX2");
  },
}));

import { writeGlb } from "../scripts/designTiles/gltf.mjs";
import { tilesetJson } from "../scripts/designTiles/tileset.mjs";
import { featureName } from "../src/io/features.ts";
import { splitGlb } from "../src/io/glb.ts";
import { parseGltf } from "../src/io/gltfParse.ts";
import { treeFromJson } from "../src/streaming/Tile.ts";
import {
  ALIGNMENTS_EXTENSION,
  ENGINEERING_FRAME_EXTENSION,
} from "../src/engineering/georeference.ts";

// A quad of two triangles, one per feature (glTF Y-up).
const mesh = () => ({
  positions: new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 0, -5, 0, 0, -5, 0, 3, 0, 10, 3, 0,
  ]),
  normals: new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1,
  ]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3, 0, 1, 4]),
  featureIds: new Uint16Array([0, 0, 0, 0, 1, 1]),
  features: [
    { name: "Mainline deck", kind: "bridge" },
    { name: "Pier 1", kind: "pier" },
  ],
  color: [0.2, 0.4, 0.6, 1] as [number, number, number, number],
});

const dataUrl = (bytes: Uint8Array) =>
  `data:model/gltf-binary;base64,${Buffer.from(bytes).toString("base64")}`;
const textures = { bc7: false, astc: false, etc2: false } as never;

describe("writeGlb", () => {
  it("writes an aligned GLB 2.0 with a JSON and a BIN chunk", () => {
    const bytes = writeGlb(mesh());
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    expect(view.getUint32(0, true)).toBe(0x46546c67);
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(bytes.byteLength);
    expect(bytes.byteLength % 4).toBe(0);
    const { json, bin } = splitGlb(bytes);
    expect(json.asset.version).toBe("2.0");
    expect(bin?.byteLength).toBe(json.buffers[0].byteLength);
    expect(json.extensionsUsed).toEqual([
      "EXT_mesh_features",
      "EXT_structural_metadata",
    ]);
  });

  it("is valid glTF: bounds, strides, targets, padding", () => {
    const m = mesh();
    const bytes = writeGlb(m);
    const { json, bin } = splitGlb(bytes);
    expect(json.accessors[0].min).toEqual([0, 0, -5]);
    expect(json.accessors[0].max).toEqual([10, 3, 0]);
    const views = json.bufferViews;
    expect(views[0].target).toBe(34962);
    expect(views[2]).toMatchObject({ target: 34962, byteStride: 4 });
    expect(views[3].target).toBe(34963);
    for (const v of views) {
      expect(v.byteLength).toBeGreaterThan(0);
      expect(v.byteOffset % 4).toBe(0);
    }
    // JSON padding is spaces, BIN padding zeros.
    const data = new DataView(bytes.buffer, bytes.byteOffset);
    const jsonLength = data.getUint32(12, true);
    const text = new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength));
    expect(text.slice(text.trimEnd().length)).toMatch(/^ *$/);
    const used = json.buffers[0].byteLength as number;
    expect(bin!.byteLength).toBeGreaterThanOrEqual(used);
    expect(Array.from(bin!.subarray(used)).every((b) => b === 0)).toBe(true);
    // Padding between views is zero too (the 2-byte tail of the names).
    for (const v of views) {
      const end = v.byteOffset + v.byteLength;
      const next = (end + 3) & ~3;
      expect(Array.from(bin!.subarray(end, next)).every((b) => b === 0)).toBe(
        true,
      );
    }
  });

  it("keeps no zero-length view when every name and kind is empty", async () => {
    const m = {
      ...mesh(),
      features: [
        { name: "", kind: "" },
        { name: "", kind: "" },
      ],
    };
    const { json } = splitGlb(writeGlb(m));
    for (const v of json.bufferViews) {
      expect(v.byteLength).toBeGreaterThan(0);
    }
    const { asset } = await parseGltf(dataUrl(writeGlb(m)), textures);
    expect(asset.featureTables[0]!.columns.name).toEqual(["", ""]);
    expect(asset.featureTables[0]!.columns.kind).toEqual(["", ""]);
  });

  it("round-trips through the engine's glTF loader", async () => {
    const m = mesh();
    const { asset, transfer } = await parseGltf(dataUrl(writeGlb(m)), textures);
    void transfer;
    expect(asset.meshes).toHaveLength(1);
    const out = asset.meshes[0]!;
    // Positions stay in glTF space; the draw matrix carries the axis change.
    expect(Array.from(out.positions)).toEqual(Array.from(m.positions));
    expect(Array.from(out.normals!)).toEqual(Array.from(m.normals));
    expect(Array.from(out.indices)).toEqual(Array.from(m.indices));
    expect(Array.from(out.featureIds!)).toEqual(Array.from(m.featureIds));
    expect(out.featureCount).toBe(2);
    const table = asset.featureTables[out.featureTable!]!;
    expect(table.count).toBe(2);
    // The name `World.feature` reports, and the properties it returns.
    expect(featureName(table, 0)).toBe("Mainline deck");
    expect(featureName(table, 1)).toBe("Pier 1");
    expect(table.columns.kind).toEqual(["bridge", "pier"]);
  });

  it("refuses inconsistent meshes", () => {
    expect(() =>
      writeGlb({ ...mesh(), featureIds: new Uint16Array(3) }),
    ).toThrow(/feature ID per vertex/);
    expect(() =>
      writeGlb({ ...mesh(), indices: new Uint32Array([0, 1, 99]) }),
    ).toThrow(/beyond/);
    expect(() =>
      writeGlb({ ...mesh(), featureIds: new Uint16Array([0, 0, 0, 0, 1, 7]) }),
    ).toThrow(/no feature/);
  });
});

describe("tilesetJson", () => {
  // A rigid placement's matrix, with digits a rounding writer would lose.
  const transform = [
    0.9999999999999998, 1.1102230246251565e-16, 0, 0, -1.1102230246251565e-16,
    0.9999999999999998, 0, 0, 0, 0, 1, 0, -2694044.123456789,
    -4297051.987654321, 3854601.5555555555, 1,
  ];
  const tree = {
    id: "root",
    box: [0, 0, 0, 100, 0, 0, 0, 50, 0, 0, 0, 20],
    geometricError: 64,
    children: [
      {
        id: "a",
        box: [-50, 0, 0, 50, 0, 0, 0, 50, 0, 0, 0, 20],
        geometricError: 16,
        content: "a.glb",
        transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -50, 0, 0, 1],
      },
      {
        id: "b",
        box: [50, 0, 0, 50, 0, 0, 0, 50, 0, 0, 0, 20],
        geometricError: 16,
        content: "b.glb",
      },
    ],
  };

  it("writes version 1.1 and parses with the engine's tree reader", () => {
    const json = tilesetJson(tree, { transform }) as never as {
      asset: { version: string };
    };
    expect(json.asset.version).toBe("1.1");
    const warnings = new Set<string>();
    const parsed = treeFromJson(
      JSON.parse(JSON.stringify(json)),
      "http://x/tileset.json",
      undefined,
      { warnings },
    );
    expect(warnings.size).toBe(0);
    expect(parsed.geometricError).toBe(64);
    expect(Array.from(parsed.root.transform)).toEqual(transform);
    expect(parsed.root.geometricError).toBeCloseTo(64, 12);
    expect(parsed.root.children).toHaveLength(2);
  });

  it("writes the root transform at full double precision", () => {
    const json = tilesetJson(tree, { transform }) as {
      root: { transform: number[] };
    };
    const through = JSON.parse(JSON.stringify(json)) as typeof json;
    expect(through.root.transform).toEqual(transform);
  });

  it("composes child transforms and keeps their errors", () => {
    const json = JSON.parse(JSON.stringify(tilesetJson(tree, { transform })));
    const parsed = treeFromJson(json, "http://x/t.json", undefined, {
      warnings: new Set<string>(),
    });
    const [a, b] = parsed.root.children as unknown as Array<{
      transform: Float64Array;
      geometricError: number;
    }>;
    expect(a!.geometricError).toBe(16);
    expect(b!.geometricError).toBe(16);
    // a is shifted 50 m along the root's x axis; b has the root's transform.
    expect(Array.from(b!.transform)).toEqual(transform);
    expect(a!.transform[12]!).toBeCloseTo(
      transform[12]! - 50 * transform[0]!,
      6,
    );
  });

  it("declares BENTLEY_engineering_frame and BENTLEY_alignments where the reader looks", () => {
    const extension = { name: "Mainline", placement: { mode: "reprojected" } };
    const alignments = { alignments: [] };
    const json = tilesetJson(tree, {
      extensions: {
        [ENGINEERING_FRAME_EXTENSION]: extension,
        [ALIGNMENTS_EXTENSION]: alignments,
      },
    }) as {
      extensionsUsed: string[];
      extensions: Record<string, unknown>;
    };
    expect(json.extensionsUsed).toEqual([
      "BENTLEY_engineering_frame",
      "BENTLEY_alignments",
    ]);
    expect(json.extensions[ENGINEERING_FRAME_EXTENSION]).toBe(extension);
    expect(json.extensions[ALIGNMENTS_EXTENSION]).toBe(alignments);
    const without = tilesetJson(tree, {}) as Record<string, unknown>;
    expect(without.extensionsUsed).toBeUndefined();
    expect(without.extensions).toBeUndefined();
  });

  it("refuses bad nodes", () => {
    expect(() => tilesetJson({ ...tree, box: [1, 2] }, {})).toThrow(/box/);
    expect(() =>
      tilesetJson(
        { ...tree, children: [tree.children[0]!, tree.children[0]!] },
        {},
      ),
    ).toThrow(/duplicate/);
    expect(() =>
      tilesetJson(
        { ...tree, transform: transform.map((v) => v + 1) },
        { transform },
      ),
    ).toThrow(/two different/);
    expect(() => tilesetJson({ ...tree, geometricError: -1 }, {})).toThrow(
      /geometricError/,
    );
  });
});
