import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import { CustomShader } from "../src/scene/CustomShader.ts";
import type { World } from "../src/scene/World.ts";
import type { FeatureTable, GltfAsset } from "../src/io/gltfTypes.ts";
import { CapacityError } from "../src/scene/CapacityError.ts";
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
  it("throws CapacityError at its capacity, and keeps what it holds", () => {
    const ids = new StringIds();
    ids.capacity = 2;
    ids.retain("a");
    ids.retain("b");
    expect(() => ids.retain("c")).toThrow(/string ids is full/);
    expect(() => ids.literal("c")).toThrow(CapacityError);
    expect(ids.retain("a")).toBeGreaterThanOrEqual(STRING_ID_BASE);
    ids.release("a");
    ids.release("a");
    expect(ids.retain("c")).toBeGreaterThanOrEqual(STRING_ID_BASE);
  });

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

  it("counts a literal's holders: two styles may share it, and the last gives it up", () => {
    const ids = new StringIds();
    const id = ids.literal("shared");
    expect(ids.literal("shared")).toBe(id);
    ids.unliteral("shared");
    expect(ids.find("shared")).toBe(id);
    // A tile's column holds it too.
    ids.retain("shared");
    ids.unliteral("shared");
    expect(ids.find("shared")).toBe(id);
    ids.release("shared");
    expect(ids.find("shared")).toBeUndefined();
    ids.unliteral("shared"); // nothing to give back: no error
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
  /** Properties a style reads (so their string columns are uploaded). */
  const watch = (...names: string[]) =>
    names.forEach((n) => stringIds.watch(n));
  const reports = () => engine.errors.map((e) => e.message);

  it("uploads a string column as its strings' ids and gives them back with the model", () => {
    watch("street", "gaps");
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

  it("uploads and interns no string column that no style reads", () => {
    const before = stringIds.size;
    const bytes = world.arenaBytes;
    const model = engine.uploadModel(
      world,
      withTable({
        count: 2,
        columns: { unread: ["Quiet St", "Quiet Ave"], height: [1, 2] },
      }),
    );
    const placement = model.place(at);
    model.release();
    expect(stringIds.size).toBe(before);
    expect(stringIds.find("Quiet St")).toBeUndefined();
    // Only the number column's two floats (and the mesh) are in the arena.
    const unread = world.arenaBytes - bytes;
    placement.remove();
    watch("unread");
    const model2 = engine.uploadModel(
      world,
      withTable({
        count: 2,
        columns: { unread: ["Quiet St", "Quiet Ave"], height: [1, 2] },
      }),
    );
    const placement2 = model2.place(at);
    model2.release();
    expect(world.arenaBytes - bytes - unread).toBeGreaterThanOrEqual(8);
    expect(stringIds.size).toBe(before + 2);
    placement2.remove();
  });

  it("keeps one id per string across models, and a style's literal ahead of the tiles", () => {
    watch("street2", "name");
    // A style compiled first: the literal has its id before any tile.
    const literal = stringIds.literal("Pine Rd");
    using a = engine.uploadModel(
      world,
      withTable({ count: 2, columns: { street2: ["Pine Rd", "Elm"] } }),
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

  it("takes a column of 200,000 distinct strings, and gives every id back", () => {
    watch("unique");
    const count = 200_000;
    const column = Array.from({ length: count }, (_, i) => `id-${i}`);
    const before = stringIds.size;
    const model = engine.uploadModel(
      world,
      withTable({ count, columns: { unique: column } }),
    );
    const placement = model.place(at);
    model.release();
    expect(stringIds.size).toBe(before + count);
    placement.remove();
    expect(stringIds.size).toBe(before);
  });

  it("skips a column when the table of strings is full, names it, and still draws the tile", () => {
    watch("full");
    const room = stringIds.size + 1;
    const capacity = stringIds.capacity;
    stringIds.capacity = room;
    try {
      const before = stringIds.size;
      const model = engine.uploadModel(
        world,
        withTable({
          count: 2,
          columns: { full: ["One", "Two"], height: [1, 2] },
        }),
      );
      const placement = model.place(at);
      model.release();
      // Nothing of the failed column is held; the tile is there.
      expect(stringIds.size).toBe(before);
      expect(placement.draws.length).toBe(1);
      // A style reading it is told.
      placement.setShader(
        new CustomShader({
          label: "reads full",
          metadata: { full: "f32" },
          wgsl: "",
        }),
      );
      expect(reports().join("\n")).toMatch(
        /reads full: the property "full".*the table of strings is full/,
      );
      placement.remove();
    } finally {
      stringIds.capacity = capacity;
    }
  });

  it("says why a style's property isn't there: mixed values, a late style, no room", () => {
    watch("mixed");
    const columns: Record<string, Array<string | number>> = {
      mixed: ["a", 1],
      late: ["b", "c"],
    };
    for (let i = 0; i < 300; i++) {
      columns[`tag${i}`] = [`a${i}`, `b${i}`];
      watch(`tag${i}`);
    }
    const model = engine.uploadModel(world, withTable({ count: 2, columns }));
    const placement = model.place(at);
    model.release();
    const reading = (property: string) =>
      new CustomShader({
        label: `reads ${property}`,
        metadata: { x: { property, type: "f32" } },
        wgsl: "",
      });
    placement.setShader(reading("mixed"));
    placement.setShader(reading("late"));
    placement.setShader(reading("tag299"));
    placement.setShader(reading("tag0"));
    const text = reports().join("\n");
    expect(text).toMatch(/reads mixed: the property "mixed".*mixes strings/);
    expect(text).toMatch(
      /reads late: the property "late".*make the FeatureStyle first/,
    );
    expect(text).toMatch(
      /reads tag299: the property "tag299".*room a mesh's directory/,
    );
    // A column that was uploaded is not reported.
    expect(text).not.toContain("reads tag0");
    placement.remove();
  });

  it("uploads the string columns a mesh's directory has room for, and still takes a table that fit before", () => {
    const columns: Record<string, string[] | number[]> = { height: [1, 2] };
    for (let i = 0; i < 300; i++) {
      columns[`room${i}`] = [`a${i}`, `b${i}`];
      watch(`room${i}`);
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
    watch("gone");
    const own = engine.createWorld();
    const before = stringIds.size;
    const model = engine.uploadModel(
      own,
      withTable({ count: 2, columns: { gone: ["Gone St", "Gone Ave"] } }),
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
