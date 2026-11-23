import { Rectangle } from "@cesium/core";
import {
  Cesium3DTilesetAreaSelection,
  Cesium3DTilesetAreaSelectionCollection,
} from "../../index.js";

describe("Scene/Cesium3DTilesetAreaSelectionCollection", () => {
  const rectangle = Rectangle.fromDegrees(-75.2, 39.9, -75.1, 40.0);

  function createArea() {
    return Cesium3DTilesetAreaSelection.fromGeometricError({
      area: rectangle,
      geometricError: 4.0,
    });
  }

  it("constructs empty", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    expect(collection.length).toBe(0);
  });

  it("adds an area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const area = createArea();

    const added = collection.add(area);

    expect(added).toBe(area);
    expect(collection.length).toBe(1);
    expect(collection.get(0)).toBe(area);
    expect(collection.contains(area)).toBe(true);
  });

  it("sets the area's collection when added", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const area = createArea();

    collection.add(area);

    expect(area._collection).toBe(collection);
  });

  it("removes an area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const first = createArea();
    const second = createArea();
    collection.add(first);
    collection.add(second);

    expect(collection.remove(first)).toBe(true);

    expect(collection.length).toBe(1);
    expect(collection.contains(first)).toBe(false);
    expect(collection.get(0)).toBe(second);
    expect(first._collection).toBeUndefined();
  });

  it("returns false when removing an area it does not contain", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const area = createArea();

    expect(collection.remove(area)).toBe(false);
  });

  it("removes all areas", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const first = createArea();
    const second = createArea();
    collection.add(first);
    collection.add(second);

    collection.removeAll();

    expect(collection.length).toBe(0);
    expect(first._collection).toBeUndefined();
    expect(second._collection).toBeUndefined();
  });

  it("uses its relaxation for the effective minimum", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const area = Cesium3DTilesetAreaSelection.fromGeometricError({
      area: rectangle,
      minimumGeometricError: 2.0,
      maximumGeometricError: 16.0,
    });
    collection.add(area);

    collection._relaxation = 4.0;

    expect(area.effectiveMinimumMeasure).toBe(8.0);
  });
});
