import VectorPropertyTable from "../../Source/Scene/VectorPropertyTable.js";

describe("Scene/VectorPropertyTable", function () {
  it("reports featuresLength from the property array", function () {
    const table = new VectorPropertyTable([{ a: 1 }, null, { b: 2 }]);
    expect(table.featuresLength).toBe(3);
  });

  it("implements hasProperty and getProperty", function () {
    const table = new VectorPropertyTable([{ name: "a", height: 5 }, null]);

    expect(table.hasProperty(0, "name")).toBe(true);
    expect(table.hasProperty(0, "missing")).toBe(false);
    expect(table.hasProperty(1, "name")).toBe(false);

    expect(table.getProperty(0, "name")).toBe("a");
    expect(table.getProperty(0, "height")).toBe(5);
    expect(table.getProperty(0, "missing")).toBeUndefined();
    expect(table.getProperty(1, "name")).toBeUndefined();
  });

  it("implements getPropertyIds with a reusable result array", function () {
    const table = new VectorPropertyTable([{ name: "a", height: 5 }, null]);

    expect(table.getPropertyIds(0)).toEqual(["name", "height"]);
    expect(table.getPropertyIds(1)).toEqual([]);

    const results = ["stale"];
    expect(table.getPropertyIds(0, results)).toEqual(["name", "height"]);
    expect(results).toEqual(["name", "height"]);
  });

  it("has no semantics or classes", function () {
    const table = new VectorPropertyTable([{ name: "a" }]);

    expect(table.hasPropertyBySemantic(0, "NAME")).toBe(false);
    expect(table.getPropertyBySemantic(0, "NAME")).toBeUndefined();
    expect(table.isClass(0, "someClass")).toBe(false);
    expect(table.isExactClass(0, "someClass")).toBe(false);
    expect(table.getExactClassName(0)).toBeUndefined();
  });

  it("estimates batchTableByteLength from keys and values", function () {
    // Strings count two bytes per character (keys included); numbers and
    // booleans count eight bytes. Null rows are skipped.
    const table = new VectorPropertyTable([
      { name: "ab", n: 1, b: true },
      null,
    ]);

    // "name" (8) + "ab" (4) + "n" (2) + 8 + "b" (2) + 8 = 32
    expect(table.batchTableByteLength).toBe(32);
    // Cached value stays stable.
    expect(table.batchTableByteLength).toBe(32);
  });

  it("reports zero batchTableByteLength for empty tables", function () {
    expect(new VectorPropertyTable([]).batchTableByteLength).toBe(0);
    expect(new VectorPropertyTable([null]).batchTableByteLength).toBe(0);
  });
});
