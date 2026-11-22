import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  featureIdSets,
  featureIdSource,
  featureName,
  isB3dm,
  readPropertyTables,
  toFeatureIds,
  unwrapB3dm,
  NULL_FEATURE,
} from "../packages/core/src/io/features.ts";

const data = new URL("fixtures/1x/", import.meta.url);
const bytes = (path: string) =>
  new Uint8Array(readFileSync(new URL(path, data)));
const glbMagic = (glb: Uint8Array) =>
  String.fromCharCode(...glb.subarray(0, 4));

describe("b3dm", () => {
  it("unwraps the GLB, RTC center and a JSON batch table", () => {
    const tile = bytes(
      "Cesium3DTiles/Batched/BatchedWithBatchTable/batchedWithBatchTable.b3dm",
    );
    expect(isB3dm(tile)).toBe(true);
    const b3dm = unwrapB3dm(tile);
    expect(glbMagic(b3dm.glb)).toBe("glTF");
    expect(b3dm.batchLength).toBe(10);
    expect(b3dm.batchTable.count).toBe(10);
    expect(b3dm.batchTable.columns.id).toHaveLength(10);
    expect(b3dm.rtcCenter).toHaveLength(3);
    expect(featureName(b3dm.batchTable, 3)).toBe(
      String(b3dm.batchTable.columns.id![3]),
    );
  });

  it("reads binary batch table properties", () => {
    const b3dm = unwrapB3dm(
      bytes(
        "Cesium3DTiles/Batched/BatchedWithBatchTableBinary/batchedWithBatchTableBinary.b3dm",
      ),
    );
    const binaryColumns = Object.values(b3dm.batchTable.columns).filter(
      (column) => column.length === 10,
    );
    expect(binaryColumns.length).toBeGreaterThan(2);
    expect(glbMagic(b3dm.glb)).toBe("glTF");
  });

  it("handles the deprecated header layouts", () => {
    for (const name of ["BatchedDeprecated1", "BatchedDeprecated2"]) {
      const b3dm = unwrapB3dm(
        bytes(
          `Cesium3DTiles/Batched/${name}/${name.charAt(0).toLowerCase()}${name.slice(1)}.b3dm`,
        ),
      );
      expect(glbMagic(b3dm.glb)).toBe("glTF");
      expect(b3dm.batchLength).toBe(10);
    }
  });
});

describe("EXT_mesh_features / EXT_structural_metadata", () => {
  const dir = "Models/glTF-2.0/BuildingsMetadata/glTF/";
  const json = JSON.parse(
    new TextDecoder().decode(bytes(`${dir}buildings-metadata.gltf`)),
  );
  const buffer = bytes(`${dir}buffer.bin`);
  const bufferView = (i: number) => {
    const v = json.bufferViews[i];
    return buffer.subarray(
      v.byteOffset ?? 0,
      (v.byteOffset ?? 0) + v.byteLength,
    );
  };

  it("selects the attribute-backed feature ID set", () => {
    const source = featureIdSource(json.meshes[0].primitives[0], undefined, []);
    expect(source).toEqual({
      attribute: "_FEATURE_ID_0",
      featureCount: 10,
      table: 0,
      nullFeatureId: undefined,
      set: 0,
    });
  });

  it("reads every feature-ID set, and names the first drawn one the identity set", () => {
    const primitive = {
      attributes: { _FEATURE_ID_1: 4 },
      extensions: {
        EXT_mesh_features: {
          featureIds: [
            { featureCount: 3, texture: { index: 0 }, label: "parts" },
            { featureCount: 5, attribute: 1, propertyTable: 2, label: "rooms" },
            { featureCount: 9 },
          ],
        },
      },
    };
    expect(featureIdSets(primitive, undefined)).toEqual([
      { index: 0, featureCount: 3, kind: "texture", label: "parts" },
      {
        index: 1,
        featureCount: 5,
        kind: "attribute",
        label: "rooms",
        propertyTable: 2,
      },
      { index: 2, featureCount: 9, kind: "implicit" },
    ]);
    expect(featureIdSource(primitive, undefined, [])?.set).toBe(1);
    expect(featureIdSets({ attributes: { _BATCHID: 0 } }, 10)).toEqual([
      {
        index: 0,
        featureCount: 10,
        kind: "batch",
        label: "_BATCHID",
        propertyTable: 0,
      },
    ]);
  });

  it("keeps each property's semantic: ID names the feature", () => {
    const semantic = structuredClone(json);
    const cls = Object.values<{
      properties: Record<string, { semantic?: string }>;
    }>(semantic.extensions.EXT_structural_metadata.schema.classes)[0]!;
    cls.properties.id!.semantic = "ID";
    const [table] = readPropertyTables(semantic, bufferView, []);
    expect(table!.semantics).toEqual({ id: "ID" });
    const [plain] = readPropertyTables(json, bufferView, []);
    expect(plain!.semantics).toBeUndefined();
  });

  it("reads property tables with defaults, noData and normalized scale/offset", () => {
    const warnings: string[] = [];
    const [table] = readPropertyTables(json, bufferView, warnings);
    expect(warnings).toEqual([]);
    expect(table!.count).toBe(10);
    expect(table!.columns.id).toHaveLength(10);
    // "year" has no values in the table: every feature gets the default.
    expect(table!.columns.year![0]).toBe("2022");
    for (const t of table!.columns.temperatureCelsius!) {
      expect(t as number).toBeGreaterThanOrEqual(18);
      expect(t as number).toBeLessThanOrEqual(24);
    }
    expect(featureName(table!, 2)).toBe(String(table!.columns.id![2]));
  });

  it("maps the null feature ID", () => {
    expect([...toFeatureIds(Float32Array.of(0, 7, 3), 7)]).toEqual([
      0,
      NULL_FEATURE,
      3,
    ]);
  });
});

describe("64-bit integer properties", () => {
  const read = (
    componentType: string,
    values: bigint[],
    extra: Record<string, unknown> = {},
    array?: number,
  ) => {
    const bytes = new Uint8Array(values.length * 8);
    const view = new DataView(bytes.buffer);
    values.forEach((v, i) => {
      if (componentType === "INT64") {
        view.setBigInt64(i * 8, v, true);
      } else {
        view.setBigUint64(i * 8, v, true);
      }
    });
    const json = {
      extensions: {
        EXT_structural_metadata: {
          schema: {
            classes: {
              c: {
                properties: {
                  id: {
                    type: "SCALAR",
                    componentType,
                    ...(array ? { array: true, count: array } : {}),
                    ...extra,
                  },
                },
              },
            },
          },
          propertyTables: [
            {
              class: "c",
              count: array ? values.length / array : values.length,
              properties: { id: { values: 0 } },
            },
          ],
        },
      },
    };
    const warnings: string[] = [];
    const [table] = readPropertyTables(json, () => bytes, warnings);
    expect(warnings).toEqual([]);
    return table!.columns.id!;
  };

  it("returns a UINT64 above 2^53 unchanged", () => {
    const big = 2n ** 64n - 1n;
    expect(read("UINT64", [big, 2n ** 53n + 1n])).toEqual([
      big,
      2n ** 53n + 1n,
    ]);
  });

  it("returns an INT64 above 2^53 unchanged, negative too", () => {
    const values = [2n ** 63n - 1n, -(2n ** 63n), -(2n ** 53n) - 1n, 5n];
    expect(read("INT64", values)).toEqual(values);
  });

  it("keeps two IDs one apart distinct", () => {
    const a = 9007199254740993n;
    const [x, y] = read("UINT64", [a, a + 1n]);
    expect(x).not.toBe(y);
    expect(x).toBe(a);
    expect(y).toBe(a + 1n);
  });

  it("returns a small value as a bigint too", () => {
    expect(read("INT64", [7n])).toEqual([7n]);
  });

  it("returns an array property's elements as bigints", () => {
    const values = [2n ** 60n + 1n, 2n ** 60n + 2n, 3n, 4n];
    expect(read("UINT64", values, {}, 2)).toEqual([
      [2n ** 60n + 1n, 2n ** 60n + 2n],
      [3n, 4n],
    ]);
  });

  it("ignores offset and scale unless normalized, as the specification leaves them undefined", () => {
    expect(read("UINT64", [2n ** 60n], { offset: 1, scale: 2 })).toEqual([
      2n ** 60n,
    ]);
  });

  it("denormalizes a normalized value to a number", () => {
    const [v] = read("UINT64", [2n ** 63n], { normalized: true });
    expect(v).toBeCloseTo(0.5, 12);
  });

  it("matches a noData given as a number or a string", () => {
    expect(read("UINT64", [5n, 6n], { noData: 5 })).toEqual([null, 6n]);
    expect(
      read("UINT64", [2n ** 60n, 6n], { noData: "1152921504606846976" }),
    ).toEqual([null, 6n]);
  });
});

describe("64-bit integer properties: edge cases", () => {
  const table = (
    properties: Record<string, unknown>,
    bytes: Uint8Array = new Uint8Array(0),
    count = 2,
    tableProperties: Record<string, unknown> = {},
    enums?: unknown,
  ) => {
    const json = {
      extensions: {
        EXT_structural_metadata: {
          schema: { classes: { c: { properties } }, enums },
          propertyTables: [{ class: "c", count, properties: tableProperties }],
        },
      },
    };
    const warnings: string[] = [];
    const [t] = readPropertyTables(json, () => bytes, warnings);
    expect(warnings).toEqual([]);
    return t!.columns;
  };
  const bytes64 = (type: "INT64" | "UINT64", values: bigint[]) => {
    const out = new Uint8Array(values.length * 8);
    const view = new DataView(out.buffer);
    values.forEach((v, i) =>
      type === "INT64"
        ? view.setBigInt64(i * 8, v, true)
        : view.setBigUint64(i * 8, v, true),
    );
    return out;
  };
  const scalar = (componentType: string, extra = {}) => ({
    id: { type: "SCALAR", componentType, ...extra },
  });

  it("normalizes INT64 at both ends", () => {
    const col = table(
      scalar("INT64", { normalized: true }),
      bytes64("INT64", [-(2n ** 63n), 2n ** 63n - 1n]),
      2,
      { id: { values: 0 } },
    ).id!;
    expect(col[0]).toBe(-1);
    expect(col[1] as number).toBeCloseTo(1, 12);
  });

  it("normalizes UINT64 at 0 and at the maximum", () => {
    const col = table(
      scalar("UINT64", { normalized: true }),
      bytes64("UINT64", [0n, 2n ** 64n - 1n]),
      2,
      { id: { values: 0 } },
    ).id!;
    expect(col[0]).toBe(0);
    expect(col[1] as number).toBeCloseTo(1, 12);
  });

  it("converts a class default of a 64-bit property to a bigint", () => {
    expect(
      table(scalar("UINT64", { default: "18446744073709551615" }), undefined, 2)
        .id,
    ).toEqual([2n ** 64n - 1n, 2n ** 64n - 1n]);
    expect(table(scalar("INT64", { default: -5 }), undefined, 1).id).toEqual([
      -5n,
    ]);
    expect(
      table(
        {
          id: {
            type: "SCALAR",
            componentType: "INT64",
            array: true,
            count: 2,
            default: [1, "-9223372036854775808"],
          },
        },
        undefined,
        1,
      ).id,
    ).toEqual([[1n, -(2n ** 63n)]]);
  });

  it("leaves a class default of a normalized 64-bit property as written", () => {
    const [v] = table(
      scalar("INT64", { normalized: true, default: -1 }),
      undefined,
      1,
    ).id!;
    expect(v).toBe(-1);
    const [u] = table(
      scalar("UINT64", { normalized: true, default: 0.5 }),
      undefined,
      1,
    ).id!;
    expect(u).toBe(0.5);
  });

  it("leaves a default of another type as written", () => {
    expect(table(scalar("INT32", { default: 7 }), undefined, 1).id).toEqual([
      7,
    ]);
  });

  it("takes a large noData given as a string, and a negative one for INT64", () => {
    const big = 2n ** 63n + 5n;
    expect(
      table(
        scalar("UINT64", { noData: big.toString() }),
        bytes64("UINT64", [big, big + 1n]),
        2,
        { id: { values: 0 } },
      ).id,
    ).toEqual([null, big + 1n]);
    expect(
      table(
        scalar("INT64", { noData: -(2 ** 53 - 1) }),
        bytes64("INT64", [-(2n ** 53n - 1n), 3n]),
        2,
        { id: { values: 0 } },
      ).id,
    ).toEqual([null, 3n]);
  });

  it("matches no value with a noData number above 2^53", () => {
    // JSON.parse has already rounded it, so it can't be the real sentinel.
    const rounded = 2 ** 60;
    expect(
      table(
        scalar("UINT64", { noData: rounded }),
        bytes64("UINT64", [BigInt(rounded), 1n]),
        2,
        { id: { values: 0 } },
      ).id,
    ).toEqual([BigInt(rounded), 1n]);
  });

  it("reads a 64-bit enum exactly", () => {
    const big = 2n ** 60n + 1n;
    const col = table(
      { id: { type: "ENUM", enumType: "e" } },
      bytes64("UINT64", [big, 3n]),
      2,
      { id: { values: 0 } },
      {
        e: {
          valueType: "UINT64",
          values: [
            { name: "A", value: 3 },
            { name: "B", value: Number(2n ** 60n) },
          ],
        },
      },
    ).id;
    // 2^60 + 1 is not the enum's 2^60, which it would be if read as a double.
    expect(col).toEqual([String(big), "A"]);
  });
});

describe("3DTILES_batch_table_hierarchy", () => {
  for (const name of [
    "BatchTableHierarchy",
    "BatchTableHierarchyBinary",
    "BatchTableHierarchyMultipleParents",
  ]) {
    it(`${name}: inherits properties through parent instances`, () => {
      const b3dm = unwrapB3dm(
        bytes(`Cesium3DTiles/Hierarchy/${name}/tile.b3dm`),
      );
      const columns = b3dm.batchTable.columns;
      // Feature 0 is a doorknob; its ancestors are a door, a building and a zone.
      for (const property of ["doorknob_name", "door_name", "building_name"]) {
        expect(columns[property]?.[0], property).not.toBeNull();
        expect(columns[property]?.[0], property).not.toBeUndefined();
      }
      // Own batch-table properties stay alongside the hierarchy's.
      expect(columns.height).toHaveLength(b3dm.batchLength);
    });
  }
});
