import { AssociativeArray } from "../../index.js";

describe("Core/AssociativeArray", function () {
  it("constructor has expected default values", function () {
    const associativeArray = new AssociativeArray();
    expect(associativeArray.length).toEqual(0);
    expect(associativeArray.values).toEqual([]);
  });

  it("can manipulate values", function () {
    const associativeArray = new AssociativeArray();

    expect(associativeArray.contains("key1")).toEqual(false);

    associativeArray.set("key1", 1);
    associativeArray.set("key2", 2);
    associativeArray.set("key3", 3);

    expect(associativeArray.get("key1")).toEqual(1);
    expect(associativeArray.get("key2")).toEqual(2);
    expect(associativeArray.get("key3")).toEqual(3);
    expect(associativeArray.length).toEqual(3);

    expect(associativeArray.contains("key1")).toEqual(true);
    expect(associativeArray.contains("key2")).toEqual(true);
    expect(associativeArray.contains("key3")).toEqual(true);

    const values = associativeArray.values;
    expect(values).toContain(1);
    expect(values).toContain(2);
    expect(values).toContain(3);
    expect(values.length).toEqual(3);

    associativeArray.set("key2", 4);
    expect(associativeArray.length).toEqual(3);

    expect(values).toContain(1);
    expect(values).not.toContain(2);
    expect(values).toContain(4);
    expect(values).toContain(3);
    expect(values.length).toEqual(3);

    expect(associativeArray.remove("key1")).toBe(true);
    expect(associativeArray.get("key1")).toBeUndefined();
    expect(associativeArray.contains("key1")).toEqual(false);
    expect(values).not.toContain(1);
    expect(values).toContain(4);
    expect(values).toContain(3);
    expect(values.length).toEqual(2);
    expect(associativeArray.remove("key1")).toBe(false);

    associativeArray.removeAll();
    expect(associativeArray.length).toEqual(0);
    expect(associativeArray.values).toEqual([]);
  });

  it("set throws with undefined key", function () {
    const associativeArray = new AssociativeArray();
    expect(function () {
      associativeArray.set(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("get throws with undefined key", function () {
    const associativeArray = new AssociativeArray();
    expect(function () {
      associativeArray.get(undefined);
    }).toThrowDeveloperError();
  });

  it("remove returns false with undefined key", function () {
    const associativeArray = new AssociativeArray();
    expect(associativeArray.remove(undefined)).toBe(false);
  });
});
