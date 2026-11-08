import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import type { FeatureTable, GltfAsset } from "../src/io/gltfTypes.ts";
import {
  STRING_ID_BASE,
  StringIds,
  stringIds,
} from "../src/scene/stringIds.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

describe("string ids", () => {
  it("gives a string one id, above every small number, held while referenced", () => {
    const ids = new StringIds();
    const a = ids.retain("Main St");
    const b = ids.retain("Oak Ave");
    expect(a).toBeGreaterThanOrEqual(STRING_ID_BASE);
    expect(b).not.toBe(a);
    // Another column with the same string, and a literal, share the id.
    expect(ids.retain("Main St")).toBe(a);
    expect(ids.literal("Main St")).toBe(a);
    expect(ids.stringOf(a)).toBe("Main St");
    // Every id is a float32 integer.
    expect(Math.fround(a)).toBe(a);
    expect(Math.fround(b)).toBe(b);
  });

  it("frees a string with its last reference and reuses the id, but never a literal", () => {
    const ids = new StringIds();
    const a = ids.retain("a");
    ids.retain("a");
    const lit = ids.literal("lit");
    ids.retain("lit");
    ids.release("a");
    expect(ids.find("a")).toBe(a);
    ids.release("a");
    expect(ids.find("a")).toBeUndefined();
    expect(ids.size).toBe(1);
    // The freed id is the next one given.
    expect(ids.retain("b")).toBe(a);
    // A literal outlives the columns that held it.
    ids.release("lit");
    expect(ids.find("lit")).toBe(lit);
  });
});

/** A one-triangle model whose features have `table`. */
function withTable(table: FeatureTable): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        featureIds: new Uint32Array([0, 1, 1]),
        featureTable: 0,
        featureCount: table.count,
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [
      {
        mesh: 0,
        material: -1,
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    ],
    featureTables: [table],
    warnings: [],
  };
}

const at = {
  modelMatrix: new Float64Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6378137, 0, 0, 1,
  ]),
};

describe("string columns on the GPU", () => {
  let engine: Engine;
  let world: World;
  /** What each staging buffer of the world's uploads held, as floats. */
  const staged: Float32Array[] = [];

  beforeAll(async () => {
    installGpuGlobals();
    const device = fakeDevice({});
    const createBuffer = device.createBuffer.bind(device);
    // The fake device's mapped ranges are fresh each call; keep the one
    // the world writes into.
    (device as unknown as Record<string, unknown>).createBuffer = (
      descriptor: GPUBufferDescriptor,
    ) => {
      const buffer = createBuffer(descriptor);
      if (descriptor.label !== "world.uploads") {
        return buffer;
      }
      const memory = new ArrayBuffer(descriptor.size);
      staged.push(new Float32Array(memory));
      return new Proxy(buffer, {
        get: (target, key) =>
          key === "getMappedRange" ? () => memory : target[key as never],
      });
    };
    installFakeNavigator(device);
    const { Engine } = await import("../src/scene/Engine.ts");
    engine = await Engine.create({ limits: "adapter" });
    world = engine.createWorld();
  });

  const floats = () => staged.flatMap((f) => [...f]);

  it("uploads a string column as its strings' ids and gives them back with the model", () => {
    const before = stringIds.size;
    let placement;
    {
      using model = engine.uploadModel(
        world,
        withTable({
          count: 3,
          columns: {
            street: ["Main St", "Oak Ave", "Main St"],
            gaps: ["Oak Ave", null, "Elm"],
            height: [3, 4, 5],
          },
        }),
      );
      placement = model.place(at);
      const main = stringIds.find("Main St")!;
      const oak = stringIds.find("Oak Ave")!;
      const elm = stringIds.find("Elm")!;
      expect(main).toBeGreaterThanOrEqual(STRING_ID_BASE);
      expect(stringIds.size).toBe(before + 3);
      // The columns' rows, by feature, next to the number column's.
      const all = floats();
      const find = (rows: number[]) =>
        all.some((_, i) => rows.every((v, k) => all[i + k] === v));
      expect(find([main, oak, main])).toBe(true);
      expect(find([oak, 0, elm])).toBe(true);
      expect(find([3, 4, 5])).toBe(true);
    }
    // The model is freed with its last placement.
    expect(stringIds.size).toBe(before + 3);
    placement.remove();
    expect(stringIds.size).toBe(before);
    expect(stringIds.find("Main St")).toBeUndefined();
  });

  it("keeps one id per string across models, and a style's literal ahead of the tiles", () => {
    // A style compiled first: the literal has its id before any tile.
    const literal = stringIds.literal("Pine Rd");
    using a = engine.uploadModel(
      world,
      withTable({ count: 2, columns: { street: ["Pine Rd", "Elm"] } }),
    );
    using b = engine.uploadModel(
      world,
      withTable({ count: 2, columns: { name: ["Elm", "Pine Rd"] } }),
    );
    a.place(at);
    b.place(at);
    // Both tables hold "Elm": one id.
    expect(stringIds.find("Elm")).toBeDefined();
    expect(stringIds.find("Pine Rd")).toBe(literal);
    expect(floats()).toContain(literal);
  });

  it("uploads the string columns a mesh's directory has room for, and still takes a table that fit before", () => {
    const columns: Record<string, string[] | number[]> = { height: [1, 2] };
    for (let i = 0; i < 300; i++) {
      columns[`tag${i}`] = [`a${i}`, `b${i}`];
    }
    const before = stringIds.size;
    const model = engine.uploadModel(world, withTable({ count: 2, columns }));
    const placement = model.place(at);
    model.release();
    // 256 entries, 32 kept back, and the number column's: 223 strings of
    // two each.
    expect(stringIds.size - before).toBe(223 * 2);
    placement.remove();
    expect(stringIds.size).toBe(before);
  });

  it("gives a destroyed world's strings back", () => {
    const own = engine.createWorld();
    const before = stringIds.size;
    const model = engine.uploadModel(
      own,
      withTable({ count: 2, columns: { street: ["Gone St", "Gone Ave"] } }),
    );
    model.place(at);
    model.release();
    expect(stringIds.size).toBe(before + 2);
    engine.worlds.splice(engine.worlds.indexOf(own), 1);
    own.destroy();
    expect(stringIds.size).toBe(before);
  });

  it("leaves a numeric column compared with a string unmatched", () => {
    // Ids sit above every small number: 1.x never matches a number with
    // a string either.
    expect(stringIds.literal("seven")).toBeGreaterThan(1e6);
  });
});
