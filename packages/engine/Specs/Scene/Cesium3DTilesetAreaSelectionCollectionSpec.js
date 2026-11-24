import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  Rectangle,
} from "@cesium/core";
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

  describe("classify", () => {
    const AreaDecision = Cesium3DTilesetAreaSelectionCollection.AreaDecision;

    function createRangeArea() {
      return Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        minimumGeometricError: 2.0,
        maximumGeometricError: 16.0,
      });
    }

    function createFixedArea() {
      return Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        geometricError: 2.0,
      });
    }

    it("refines a tile coarser than the range", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, 32.0, false)).toBe(AreaDecision.REFINE);
    });

    it("defers a tile inside the range", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, 8.0, false)).toBe(AreaDecision.DEFER);
    });

    it("stops a tile at the fine bound", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, 2.0, false)).toBe(AreaDecision.STOP);
    });

    it("stops a tile finer than the range", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, 1.0, false)).toBe(AreaDecision.STOP);
    });

    it("refines or stops at a fixed level of detail", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createFixedArea());

      expect(collection.classify(area, 4.0, false)).toBe(AreaDecision.REFINE);
      expect(collection.classify(area, 2.0, false)).toBe(AreaDecision.STOP);
    });

    it("defers an invalid measure", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, NaN, false)).toBe(AreaDecision.DEFER);
      expect(collection.classify(area, -1.0, false)).toBe(AreaDecision.DEFER);
    });

    it("refines a tile inside the range in the area pass", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, 8.0, true)).toBe(AreaDecision.REFINE);
    });

    it("defers an invalid measure in the area pass", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      expect(collection.classify(area, NaN, true)).toBe(AreaDecision.DEFER);
      expect(collection.classify(area, -1.0, true)).toBe(AreaDecision.DEFER);
    });

    it("stops at the relaxed fine bound", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const area = collection.add(createRangeArea());

      collection._relaxation = 4.0;

      expect(collection.classify(area, 8.0, false)).toBe(AreaDecision.STOP);
    });
  });

  describe("combine", () => {
    const AreaDecision = Cesium3DTilesetAreaSelectionCollection.AreaDecision;

    function createArea(minimumMeasure, maximumMeasure, measure) {
      return new Cesium3DTilesetAreaSelection({
        area: rectangle,
        measure: measure ?? ((tile) => tile.geometricError),
        minimumMeasure: minimumMeasure,
        maximumMeasure: maximumMeasure,
      });
    }

    function createMeasureSpy() {
      return jasmine
        .createSpy("measure")
        .and.callFake((tile) => tile.geometricError);
    }

    function createTile(geometricError, depth) {
      return {
        geometricError: geometricError,
        _areaSelectionDepth: depth ?? 0,
      };
    }

    it("defers when the mask is 0", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createArea(2.0, 2.0));

      expect(collection.combine(0, createTile(2.0), false)).toBe(
        AreaDecision.DEFER,
      );
    });

    it("defers when the mask holds no area of the collection", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(2.0, 2.0));

      expect(collection.combine(0b1000, createTile(2.0), false)).toBe(
        AreaDecision.DEFER,
      );
    });

    it("stops when every area stops", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(32.0, 32.0));

      expect(collection.combine(0b11, createTile(2.0), false)).toBe(
        AreaDecision.STOP,
      );
    });

    it("refines when any area refines", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(32.0, 32.0));

      expect(collection.combine(0b11, createTile(32.0), false)).toBe(
        AreaDecision.REFINE,
      );
    });

    it("does not measure the remaining areas after a refine", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const secondMeasure = createMeasureSpy();
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(32.0, 32.0, secondMeasure));

      expect(collection.combine(0b11, createTile(32.0), false)).toBe(
        AreaDecision.REFINE,
      );
      expect(secondMeasure).not.toHaveBeenCalled();
    });

    it("defers when an area defers and no area refines", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(createArea(2.0, 16.0));
      collection.add(createArea(32.0, 32.0));

      expect(collection.combine(0b11, createTile(8.0), false)).toBe(
        AreaDecision.DEFER,
      );
    });

    it("only measures the areas in the mask", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const firstMeasure = createMeasureSpy();
      const secondMeasure = createMeasureSpy();
      collection.add(createArea(2.0, 2.0, firstMeasure));
      collection.add(createArea(2.0, 2.0, secondMeasure));

      collection.combine(0b10, createTile(2.0), false);

      expect(firstMeasure).not.toHaveBeenCalled();
      expect(secondMeasure).toHaveBeenCalled();
    });

    it("passes the measured tile and its depth to the measure", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const measure = createMeasureSpy();
      collection.add(createArea(2.0, 2.0, measure));
      const tile = createTile(4.0, 3);

      collection.combine(0b1, tile, false);

      expect(measure).toHaveBeenCalledWith(tile, 3);
    });

    it("classifies each area in its own units", () => {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      const depthMeasure = (tile, depth) => Math.pow(2.0, -depth);
      collection.add(createArea(2.0, 2.0));
      collection.add(createArea(0.25, 0.25, depthMeasure));

      // The geometric error area stops at 1, but at depth 1 the depth
      // measure is 0.5, which is coarser than 0.25.
      expect(collection.combine(0b11, createTile(1.0, 1), false)).toBe(
        AreaDecision.REFINE,
      );
      // At depth 2 the depth measure is 0.25, so both areas stop.
      expect(collection.combine(0b11, createTile(1.0, 2), false)).toBe(
        AreaDecision.STOP,
      );
    });
  });

  describe("applyRange", () => {
    const threshold = 16.0;
    const refinedError = threshold + CesiumMath.EPSILON5 * threshold;

    // The area refines above 16, defers between 2 and 16, and stops at 2.
    function createCollection(measure) {
      const collection = new Cesium3DTilesetAreaSelectionCollection();
      collection.add(
        new Cesium3DTilesetAreaSelection({
          area: rectangle,
          measure: measure ?? ((tile) => tile.geometricError),
          minimumMeasure: 2.0,
          maximumMeasure: 16.0,
        }),
      );
      return collection;
    }

    function createTile(geometricError, parent) {
      return {
        geometricError: geometricError,
        parent: parent,
        _areaSelectionDepth: 0,
        _areaSelectionMask: 0b1,
      };
    }

    it("raises the error above the threshold when the areas refine", () => {
      const collection = createCollection();
      const tile = createTile(32.0);

      const error = collection.applyRange(tile, false, false, 3.0, threshold);

      expect(error).toBe(refinedError);
      expect(error).toBeGreaterThan(threshold);
    });

    it("keeps a larger camera error when the areas refine", () => {
      const collection = createCollection();
      const tile = createTile(32.0);

      expect(collection.applyRange(tile, false, false, 40.0, threshold)).toBe(
        40.0,
      );
    });

    it("caps the error at the threshold when the areas stop", () => {
      const collection = createCollection();
      const tile = createTile(2.0);

      expect(collection.applyRange(tile, false, false, 40.0, threshold)).toBe(
        threshold,
      );
    });

    it("keeps a smaller camera error when the areas stop", () => {
      const collection = createCollection();
      const tile = createTile(2.0);

      expect(collection.applyRange(tile, false, false, 3.0, threshold)).toBe(
        3.0,
      );
    });

    it("leaves the error unchanged when the areas defer", () => {
      const collection = createCollection();
      const tile = createTile(8.0);

      expect(collection.applyRange(tile, false, false, 3.0, threshold)).toBe(
        3.0,
      );
      expect(collection.applyRange(tile, false, false, 40.0, threshold)).toBe(
        40.0,
      );
    });

    it("refines a deferring tile in the area pass", () => {
      const collection = createCollection();
      const tile = createTile(8.0);

      expect(
        collection.applyRange(tile, false, false, 3.0, threshold, true),
      ).toBe(refinedError);
    });

    it("leaves the error unchanged when no area covers the tile", () => {
      const measure = jasmine.createSpy("measure");
      const collection = createCollection(measure);
      const tile = createTile(2.0);
      tile._areaSelectionMask = 0;

      expect(collection.applyRange(tile, false, false, 40.0, threshold)).toBe(
        40.0,
      );
      expect(measure).not.toHaveBeenCalled();
    });

    it("leaves the error unchanged in the progressive resolution call when the areas refine", () => {
      const collection = createCollection();
      const tile = createTile(32.0);

      expect(collection.applyRange(tile, false, true, 3.0, threshold)).toBe(
        3.0,
      );
    });

    it("caps the error in the progressive resolution call when the areas stop", () => {
      const collection = createCollection();
      const tile = createTile(2.0);

      expect(collection.applyRange(tile, false, true, 40.0, threshold)).toBe(
        threshold,
      );
    });

    it("measures the parent when using the parent's geometric error", () => {
      const measure = jasmine
        .createSpy("measure")
        .and.callFake((tile) => tile.geometricError);
      const collection = createCollection(measure);
      const parent = createTile(32.0);
      parent._areaSelectionDepth = 2;
      const tile = createTile(2.0, parent);
      tile._areaSelectionDepth = 3;

      // The tile alone would stop, but its parent refines.
      expect(collection.applyRange(tile, true, false, 3.0, threshold)).toBe(
        refinedError,
      );
      expect(measure).toHaveBeenCalledWith(parent, 2);
      expect(measure).not.toHaveBeenCalledWith(tile, 3);
    });

    it("refines a tile without a parent when using the parent's geometric error", () => {
      const collection = createCollection();
      const tile = createTile(2.0);

      expect(collection.applyRange(tile, true, false, 3.0, threshold)).toBe(
        refinedError,
      );
    });

    it("uses an absolute epsilon for a small threshold", () => {
      const collection = createCollection();
      const tile = createTile(32.0);

      expect(collection.applyRange(tile, false, false, 0.1, 0.5)).toBe(
        0.5 + CesiumMath.EPSILON5,
      );
    });
  });
});
