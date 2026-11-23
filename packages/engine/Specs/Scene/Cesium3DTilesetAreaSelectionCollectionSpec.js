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

  it("starts at version 0", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    expect(collection._version).toBe(0);
    expect(collection._activeMask).toBe(0);
  });

  it("increments the version on add, remove, and removeAll", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const first = createArea();
    const second = createArea();

    let version = collection._version;
    collection.add(first);
    expect(collection._version).toBeGreaterThan(version);

    version = collection._version;
    collection.add(second);
    expect(collection._version).toBeGreaterThan(version);

    version = collection._version;
    collection.remove(first);
    expect(collection._version).toBeGreaterThan(version);

    version = collection._version;
    collection.removeAll();
    expect(collection._version).toBeGreaterThan(version);
  });

  it("does not increment the version when removing a missing area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    collection.add(createArea());
    const version = collection._version;

    collection.remove(createArea());

    expect(collection._version).toBe(version);
  });

  it("sets a bit for each shown area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();

    collection.add(createArea());
    collection.add(createArea());

    expect(collection._activeMask).toBe(0b11);
  });

  it("clears the bit of a hidden area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    collection.add(createArea());
    const second = collection.add(createArea());

    let version = collection._version;
    second.show = false;
    expect(collection._activeMask).toBe(0b01);
    expect(collection._version).toBeGreaterThan(version);

    version = collection._version;
    second.show = true;
    expect(collection._activeMask).toBe(0b11);
    expect(collection._version).toBeGreaterThan(version);
  });

  it("recomputes the mask after a removal", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const first = collection.add(createArea());
    collection.add(createArea());
    const third = collection.add(createArea());
    third.show = false;
    expect(collection._activeMask).toBe(0b011);

    collection.remove(first);

    expect(collection._activeMask).toBe(0b01);
  });
});
