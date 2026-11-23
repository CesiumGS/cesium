import { BoundingSphere, Cartesian3, Rectangle } from "@cesium/core";
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

  it("throws when adding without an area", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    expect(() => collection.add(undefined)).toThrowDeveloperError();
  });

  it("throws when adding an area twice", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    const area = collection.add(createArea());

    expect(() => collection.add(area)).toThrowDeveloperError();
    expect(collection.length).toBe(1);
  });

  it("throws when adding an area from another collection", () => {
    const first = new Cesium3DTilesetAreaSelectionCollection();
    const second = new Cesium3DTilesetAreaSelectionCollection();
    const area = first.add(createArea());

    expect(() => second.add(area)).toThrowDeveloperError();
    expect(second.length).toBe(0);
    expect(area._collection).toBe(first);
  });

  it("adds an area to another collection after removal", () => {
    const first = new Cesium3DTilesetAreaSelectionCollection();
    const second = new Cesium3DTilesetAreaSelectionCollection();
    const area = first.add(createArea());
    first.remove(area);

    second.add(area);

    expect(second.contains(area)).toBe(true);
    expect(area._collection).toBe(second);
  });

  it("throws when adding more than 31 areas", () => {
    const collection = new Cesium3DTilesetAreaSelectionCollection();
    for (let i = 0; i < 31; ++i) {
      collection.add(createArea());
    }

    expect(() => collection.add(createArea())).toThrowDeveloperError();
    expect(collection.length).toBe(31);
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

  describe("computeMask", () => {
    function createSphereArea(x) {
      return Cesium3DTilesetAreaSelection.fromGeometricError({
        area: new BoundingSphere(new Cartesian3(x, 0.0, 0.0), 10.0),
        geometricError: 4.0,
      });
    }

    function createTile(x, radius) {
      return {
        _boundingVolume: new BoundingSphere(
          new Cartesian3(x, 0.0, 0.0),
          radius,
        ),
      };
    }

    function createCollection() {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createSphereArea(0.0));
      collection.add(createSphereArea(1000.0));
      collection.add(createSphereArea(2000.0));
      return collection;
    }

    it("keeps the areas a tile overlaps", () => {
      const collection = createCollection();
      const tile = createTile(0.0, 1.0);

      expect(collection.computeMask(tile, 0b111)).toBe(0b001);
    });

    it("returns 0 for a tile outside every area", () => {
      const collection = createCollection();
      const tile = createTile(5000.0, 1.0);

      expect(collection.computeMask(tile, 0b111)).toBe(0);
    });

    it("keeps several overlapping areas", () => {
      const collection = createCollection();
      const tile = createTile(500.0, 600.0);

      expect(collection.computeMask(tile, 0b111)).toBe(0b011);
    });

    it("only tests areas in the parent mask", () => {
      const collection = createCollection();
      const tile = createTile(0.0, 1.0);
      const cullingVolume = collection.get(0)._cullingVolume;
      spyOn(cullingVolume, "computeVisibility").and.callThrough();

      expect(collection.computeMask(tile, 0b110)).toBe(0);
      expect(cullingVolume.computeVisibility).not.toHaveBeenCalled();
    });
  });
});
