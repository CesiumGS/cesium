import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  featureIdSource,
  featureName,
  isB3dm,
  readPropertyTables,
  toFeatureIds,
  unwrapB3dm,
  NULL_FEATURE,
} from "../src/io/features.ts";

const data = new URL("../../../Specs/Data/", import.meta.url);
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
    });
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
