// A 64-bit integer property is a bigint; the feature table upload turns it
// into a float32 as it always did, and doesn't throw on it.
import { describe, expect, it } from "vitest";
import { plannedColumns } from "../packages/next/src/scene/world/featureTables.ts";
import type { FeatureTable } from "../packages/next/src/io/gltfTypes.ts";

describe("featureTables with bigint columns", () => {
  it("uploads a scalar bigint column as Number(v)", () => {
    const table: FeatureTable = {
      name: "t",
      className: "c",
      count: 3,
      columns: { id: [2n ** 60n, -5n, null] },
    };
    const column = plannedColumns(table).columns.find((c) => c.name === "id")!;
    expect(column.components).toBe(1);
    expect([...column.data!]).toEqual([Math.fround(2 ** 60), -5, 0]);
  });

  it("uploads an array bigint column as Number(v) per element", () => {
    const table: FeatureTable = {
      name: "t",
      className: "c",
      count: 2,
      columns: {
        pair: [
          [1n, 2n],
          [3n, 4n],
        ],
      },
    };
    const column = plannedColumns(table).columns.find(
      (c) => c.name === "pair",
    )!;
    expect(column.components).toBe(2);
    expect([...column.data!]).toEqual([1, 2, 3, 4]);
  });
});
