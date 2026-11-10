// The BENTLEY_brep glTF extension (draft): the writer and reader round trip,
// parseGltf reads a b-rep beside a primitive's fallback triangles, and a
// malformed or truncated extension drops the b-rep and keeps the mesh.
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/io/decoders.ts", () => ({
  decodeDraco: async () => {
    throw new Error("no Draco");
  },
  transcodeKtx2: async () => {
    throw new Error("no KTX2");
  },
}));

import type { BrepForm } from "../src/brep/form.ts";
import { readBrepExtension, writeBrepExtension } from "../src/brep/gltf.ts";
import { validateBrep } from "../src/brep/validate.ts";
import { parseGltf } from "../src/io/gltfParse.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  trimmedNurbsBrep,
} from "./brepFixtures.ts";

const textures = {
  bc7: false,
  astc: false,
  etc2: false,
} as unknown as Parameters<typeof parseGltf>[1];

/** A view function over a written chunk, its bytes shifted `shift` bytes into memory. */
function viewsOf(
  written: ReturnType<typeof writeBrepExtension>,
  first: number,
  shift = 0,
): (index: number) => Uint8Array {
  const memory = new Uint8Array(written.binary.length + 16);
  memory.set(written.binary, shift);
  return (index) => {
    const v = written.bufferViews[index - first] as {
      byteOffset: number;
      byteLength: number;
    };
    if (!v) {
      throw new Error("no such bufferView");
    }
    return memory.subarray(
      shift + v.byteOffset,
      shift + v.byteOffset + v.byteLength,
    );
  };
}

function arraysOf(form: BrepForm): Record<string, ArrayLike<number>> {
  const out: Record<string, ArrayLike<number>> = {};
  for (const [key, value] of Object.entries(form)) {
    if (ArrayBuffer.isView(value)) {
      out[key] = value as unknown as ArrayLike<number>;
    }
  }
  for (const name of ["curves2", "curves3"] as const) {
    for (const [key, value] of Object.entries(form[name])) {
      out[`${name}.${key}`] = value as ArrayLike<number>;
    }
  }
  return out;
}

function expectEqualForms(got: BrepForm, want: BrepForm): void {
  expect(got.version).toBe(want.version);
  const a = arraysOf(got);
  const b = arraysOf(want);
  expect(Object.keys(a)).toEqual(Object.keys(b));
  for (const key of Object.keys(b)) {
    expect(a[key]!.constructor, key).toBe(b[key]!.constructor);
    expect(Array.from(a[key]!), key).toEqual(Array.from(b[key]!));
  }
  expect(got.ids).toEqual(want.ids);
}

const FIXTURES: Array<[string, () => BrepForm]> = [
  ["box", boxBrep],
  ["capped cylinder", cappedCylinderBrep],
  ["trimmed NURBS", trimmedNurbsBrep],
];

describe("BENTLEY_brep writer and reader", () => {
  for (const [name, make] of FIXTURES) {
    it(`round trips the ${name}`, () => {
      const form = make();
      const written = writeBrepExtension([form], 0);
      const warnings: string[] = [];
      const [read] = readBrepExtension(
        { extensions: { BENTLEY_brep: written.extension } },
        viewsOf(written, 0),
        warnings,
      );
      expect(warnings).toEqual([]);
      expect(read).toBeDefined();
      expectEqualForms(read!, form);
      expect(validateBrep(read!)).toEqual([]);
    });
  }

  it("pads every array to 8 bytes and numbers views from firstBufferView", () => {
    const written = writeBrepExtension([boxBrep(), boxBrep()], 5);
    const views = written.bufferViews as Array<{ byteOffset: number }>;
    expect(views.every((v) => v.byteOffset % 8 === 0)).toBe(true);
    const [first, second] = (
      written.extension as { breps: Array<{ surfaceKind: number }> }
    ).breps;
    expect(first!.surfaceKind).toBe(5);
    expect(second!.surfaceKind).toBe(5 + views.length / 2);
  });

  it("copies an array whose bufferView is not aligned, and reads it right", () => {
    const form = cappedCylinderBrep();
    const written = writeBrepExtension([form], 0);
    const [read] = readBrepExtension(
      { extensions: { BENTLEY_brep: written.extension } },
      viewsOf(written, 0, 3),
      [],
    );
    expect(read).toBeDefined();
    expectEqualForms(read!, form);
  });

  it("skips a b-rep whose count does not match, naming the b-rep and property", () => {
    const form = boxBrep();
    const bad: BrepForm = {
      ...form,
      surfaceFrame: form.surfaceFrame.slice(0, -9),
    };
    const written = writeBrepExtension([form, bad], 0);
    const warnings: string[] = [];
    const read = readBrepExtension(
      { extensions: { BENTLEY_brep: written.extension } },
      viewsOf(written, 0),
      warnings,
    );
    expect(read[0]).toBeDefined();
    expect(read[1]).toBeUndefined();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^BENTLEY_brep: /);
    expect(warnings[0]).toContain("b-rep 1");
    expect(warnings[0]).toContain("surfaceFrame");
  });

  it("skips a b-rep whose byte length is not a whole number of elements", () => {
    const written = writeBrepExtension([boxBrep()], 0);
    const views = viewsOf(written, 0);
    const warnings: string[] = [];
    const read = readBrepExtension(
      { extensions: { BENTLEY_brep: written.extension } },
      (i) => (i === 3 ? views(i).subarray(0, 7) : views(i)),
      warnings,
    );
    expect(read).toEqual([undefined]);
    expect(warnings[0]).toContain("b-rep 0");
  });

  it("never throws on garbage", () => {
    const warnings: string[] = [];
    const none = () => new Uint8Array(0);
    expect(readBrepExtension({}, none, warnings)).toEqual([]);
    expect(
      readBrepExtension(
        {
          extensions: {
            BENTLEY_brep: { breps: [null, 3, {}, { version: 1 }] },
          },
        },
        none,
        warnings,
      ),
    ).toEqual([undefined, undefined, undefined, undefined]);
    expect(warnings.every((w) => w.startsWith("BENTLEY_brep: "))).toBe(true);
  });
});

/** The box's 12 triangles as a unit cube, in glTF's two accessors. */
function cube(): { positions: Float32Array; indices: Uint16Array } {
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  const indices = new Uint16Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0,
    4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]);
  return { positions, indices };
}

/**
 * A GLB: the cube as one primitive carrying `BENTLEY_brep` `{brep: 0}`, and
 * the box's b-rep at the root. `breakIt` edits the root extension's JSON.
 */
function glb(
  breakIt?: (root: { breps: Array<Record<string, unknown>> }) => void,
) {
  const { positions, indices } = cube();
  const form = boxBrep();
  const pad = (n: number) => Math.ceil(n / 8) * 8;
  const posBytes = new Uint8Array(positions.buffer);
  const idxBytes = new Uint8Array(indices.buffer);
  const idxAt = pad(posBytes.length);
  const brepAt = idxAt + pad(idxBytes.length);
  const written = writeBrepExtension([form], 2);
  const bin = new Uint8Array(brepAt + written.binary.length);
  bin.set(posBytes, 0);
  bin.set(idxBytes, idxAt);
  bin.set(written.binary, brepAt);
  const root = written.extension as { breps: Array<Record<string, unknown>> };
  breakIt?.(root);
  const json = {
    asset: { version: "2.0" },
    extensionsUsed: ["BENTLEY_brep"],
    extensions: { BENTLEY_brep: root },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length },
      { buffer: 0, byteOffset: idxAt, byteLength: idxBytes.length },
      ...(written.bufferViews as Array<{ byteOffset: number }>).map((v) => ({
        ...v,
        byteOffset: v.byteOffset + brepAt,
      })),
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 1],
      },
      { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            extensions: { BENTLEY_brep: { brep: 0 } },
          },
        ],
      },
    ],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  jsonBytes = Uint8Array.from([
    ...jsonBytes,
    ...new Array(pad(jsonBytes.length) - jsonBytes.length).fill(0x20),
  ]);
  const binPadded = new Uint8Array(pad(bin.length));
  binPadded.set(bin);
  const out = new Uint8Array(12 + 8 + jsonBytes.length + 8 + binPadded.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  view.setUint32(20 + jsonBytes.length, binPadded.length, true);
  view.setUint32(24 + jsonBytes.length, 0x004e4942, true);
  out.set(binPadded, 28 + jsonBytes.length);
  return {
    url: `data:application/octet-stream;base64,${Buffer.from(out).toString("base64")}`,
    form,
  };
}

describe("parseGltf with BENTLEY_brep", () => {
  it("reads the b-rep beside the fallback triangles", async () => {
    const { url, form } = glb();
    const { asset, transfer } = await parseGltf(url, textures);
    expect(asset.warnings).toEqual([]);
    expect(asset.meshes).toHaveLength(1);
    expect(asset.meshes[0]!.indices.length).toBe(36);
    expect(asset.meshes[0]!.brep).toBe(0);
    expect(asset.breps).toHaveLength(1);
    const read = asset.breps![0]!;
    expectEqualForms(read, form);
    expect(validateBrep(read)).toEqual([]);
    // Every array's buffer is transferred, once.
    expect(new Set(transfer).size).toBe(transfer.length);
    for (const a of Object.values(arraysOf(read))) {
      expect(transfer).toContain((a as unknown as Float64Array).buffer);
    }
    expect(() => structuredClone(asset, { transfer })).not.toThrow();
  });

  it("keeps the mesh and drops a truncated b-rep, with a warning", async () => {
    const { url } = glb((root) => {
      root.breps[0]!.patchPoints = 9999;
    });
    const { asset } = await parseGltf(url, textures);
    expect(asset.meshes).toHaveLength(1);
    expect(asset.meshes[0]!.indices.length).toBe(36);
    expect(asset.meshes[0]!.brep).toBeUndefined();
    expect(asset.breps ?? [undefined]).toEqual([undefined]);
    expect(asset.warnings.some((w) => w.includes("BENTLEY_brep"))).toBe(true);
    expect(asset.warnings.join(" ")).toContain("patchPoints");
  });

  it("has no breps when the root extension is absent", async () => {
    const { url } = glb();
    const bytes = Buffer.from(url.split(",")[1]!, "base64");
    const text = bytes
      .toString("latin1")
      .replace(
        /"extensions":\{"BENTLEY_brep":\{"breps"/,
        '"extensioxs":{"BENTLEY_brep":{"breps"',
      );
    const { asset } = await parseGltf(
      `data:application/octet-stream;base64,${Buffer.from(text, "latin1").toString("base64")}`,
      textures,
    );
    expect(asset.breps).toBeUndefined();
    expect(asset.meshes[0]!.brep).toBeUndefined();
  });
});
