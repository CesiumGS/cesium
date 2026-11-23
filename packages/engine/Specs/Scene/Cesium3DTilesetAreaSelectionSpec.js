import {
  BoundingSphere,
  Cartesian3,
  Intersect,
  Matrix3,
  OrientedBoundingBox,
  Rectangle,
} from "@cesium/core";
import { Cesium3DTilesetAreaSelection } from "../../index.js";

describe("Scene/Cesium3DTilesetAreaSelection", () => {
  const rectangle = Rectangle.fromDegrees(-75.2, 39.9, -75.1, 40.0);

  const measure = (tile) => tile.geometricError;

  function createOptions(extra) {
    return {
      area: rectangle,
      measure: measure,
      minimumMeasure: 2.0,
      maximumMeasure: 16.0,
      ...extra,
    };
  }

  it("constructs with default values", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    expect(areaSelection.minimumHeight).toBe(-1000.0);
    expect(areaSelection.maximumHeight).toBe(10000.0);
    expect(areaSelection.show).toBe(true);
  });

  it("constructs with options", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({
        minimumHeight: 100.0,
        maximumHeight: 200.0,
        show: false,
      }),
    );
    expect(areaSelection.minimumHeight).toBe(100.0);
    expect(areaSelection.maximumHeight).toBe(200.0);
    expect(areaSelection.show).toBe(false);
  });

  it("stores the measure and range", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    expect(areaSelection.measure).toBe(measure);
    expect(areaSelection.minimumMeasure).toBe(2.0);
    expect(areaSelection.maximumMeasure).toBe(16.0);
  });

  it("sets show", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    areaSelection.show = false;
    expect(areaSelection.show).toBe(false);
    areaSelection.show = true;
    expect(areaSelection.show).toBe(true);
  });

  it("stores a copy of the area", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    const area = areaSelection.area;
    expect(area).toEqual(rectangle);
    expect(area).not.toBe(rectangle);
  });

  it("throws without area", () => {
    expect(() => new Cesium3DTilesetAreaSelection()).toThrowDeveloperError();
  });

  it("throws with an unsupported area type", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ area: new Cartesian3() }),
        ),
    ).toThrowDeveloperError();
  });

  it("accepts an OrientedBoundingBox", () => {
    const obb = new OrientedBoundingBox(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(10.0, 20.0, 30.0)),
    );
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ area: obb }),
    );
    expect(areaSelection.area).toEqual(obb);
    expect(areaSelection.area).not.toBe(obb);
  });

  it("accepts a BoundingSphere", () => {
    const sphere = new BoundingSphere(Cartesian3.ZERO, 10.0);
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ area: sphere }),
    );
    expect(areaSelection.area).toEqual(sphere);
    expect(areaSelection.area).not.toBe(sphere);
  });

  it("builds a culling volume for a BoundingSphere", () => {
    const sphere = new BoundingSphere(Cartesian3.ZERO, 10.0);
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ area: sphere }),
    );
    const cullingVolume = areaSelection._cullingVolume;

    expect(cullingVolume.planes.length).toBe(6);

    const inside = new BoundingSphere(new Cartesian3(0.0, 0.0, 0.0), 1.0);
    const outside = new BoundingSphere(new Cartesian3(50.0, 0.0, 0.0), 1.0);
    const intersecting = new BoundingSphere(
      new Cartesian3(10.0, 0.0, 0.0),
      1.0,
    );
    expect(cullingVolume.computeVisibility(inside)).toBe(Intersect.INSIDE);
    expect(cullingVolume.computeVisibility(outside)).toBe(Intersect.OUTSIDE);
    expect(cullingVolume.computeVisibility(intersecting)).toBe(
      Intersect.INTERSECTING,
    );
  });

  it("builds a culling volume for an OrientedBoundingBox", () => {
    const obb = new OrientedBoundingBox(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(10.0, 20.0, 30.0)),
    );
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ area: obb }),
    );
    const cullingVolume = areaSelection._cullingVolume;

    expect(cullingVolume.planes.length).toBe(6);

    const inside = new BoundingSphere(new Cartesian3(0.0, 0.0, 0.0), 1.0);
    const outside = new BoundingSphere(new Cartesian3(25.0, 0.0, 0.0), 1.0);
    const outsideNegative = new BoundingSphere(
      new Cartesian3(-25.0, 0.0, 0.0),
      1.0,
    );
    const intersecting = new BoundingSphere(
      new Cartesian3(0.0, 20.0, 0.0),
      1.0,
    );

    expect(cullingVolume.computeVisibility(inside)).toBe(Intersect.INSIDE);
    expect(cullingVolume.computeVisibility(outside)).toBe(Intersect.OUTSIDE);
    expect(cullingVolume.computeVisibility(outsideNegative)).toBe(
      Intersect.OUTSIDE,
    );
    expect(cullingVolume.computeVisibility(intersecting)).toBe(
      Intersect.INTERSECTING,
    );
  });

  it("throws when minimumHeight is greater than maximumHeight", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({
            minimumHeight: 100.0,
            maximumHeight: 0.0,
          }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws without measure", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(createOptions({ measure: undefined })),
    ).toThrowDeveloperError();
  });

  it("throws when measure is not a function", () => {
    expect(
      () => new Cesium3DTilesetAreaSelection(createOptions({ measure: 5 })),
    ).toThrowDeveloperError();
  });

  it("throws without minimumMeasure", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ minimumMeasure: undefined }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws when minimumMeasure is NaN", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ minimumMeasure: NaN }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws without maximumMeasure", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ maximumMeasure: undefined }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws when maximumMeasure is NaN", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ maximumMeasure: NaN }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws when minimumMeasure is negative", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ minimumMeasure: -1.0 }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws when minimumMeasure is infinite", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ minimumMeasure: Infinity, maximumMeasure: Infinity }),
        ),
    ).toThrowDeveloperError();
  });

  it("throws when maximumMeasure is less than minimumMeasure", () => {
    expect(
      () =>
        new Cesium3DTilesetAreaSelection(
          createOptions({ minimumMeasure: 16.0, maximumMeasure: 2.0 }),
        ),
    ).toThrowDeveloperError();
  });

  it("accepts an infinite maximumMeasure", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ maximumMeasure: Infinity }),
    );
    expect(areaSelection.maximumMeasure).toBe(Infinity);
  });

  it("accepts equal minimumMeasure and maximumMeasure", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(
      createOptions({ minimumMeasure: 8.0, maximumMeasure: 8.0 }),
    );
    expect(areaSelection.minimumMeasure).toBe(8.0);
    expect(areaSelection.maximumMeasure).toBe(8.0);
  });

  it("uses minimumMeasure as the effective minimum without a collection", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    expect(areaSelection.effectiveMinimumMeasure).toBe(2.0);
  });

  it("relaxes the effective minimum and clamps it at maximumMeasure", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());

    areaSelection._collection = { _relaxation: 4.0 };
    expect(areaSelection.effectiveMinimumMeasure).toBe(8.0);

    areaSelection._collection._relaxation = 10.0;
    expect(areaSelection.effectiveMinimumMeasure).toBe(16.0);
  });

  it("builds a culling volume for a Rectangle", () => {
    const areaSelection = new Cesium3DTilesetAreaSelection(createOptions());
    const cullingVolume = areaSelection._cullingVolume;

    expect(cullingVolume.planes.length).toBe(6);

    const center = Rectangle.center(rectangle);
    const probeAt = (height) =>
      new BoundingSphere(
        Cartesian3.fromRadians(center.longitude, center.latitude, height),
        1.0,
      );

    expect(cullingVolume.computeVisibility(probeAt(0.0))).toBe(
      Intersect.INSIDE,
    );
    expect(cullingVolume.computeVisibility(probeAt(9000.0))).toBe(
      Intersect.INSIDE,
    );
    expect(cullingVolume.computeVisibility(probeAt(11000.0))).toBe(
      Intersect.OUTSIDE,
    );
    expect(cullingVolume.computeVisibility(probeAt(-2000.0))).toBe(
      Intersect.OUTSIDE,
    );
  });

  describe("fromGeometricError", () => {
    it("creates a fixed level of detail", () => {
      const areaSelection = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        geometricError: 4.0,
      });
      expect(areaSelection.minimumMeasure).toBe(4.0);
      expect(areaSelection.maximumMeasure).toBe(4.0);
    });

    it("creates a range", () => {
      const areaSelection = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        minimumGeometricError: 2.0,
        maximumGeometricError: 16.0,
      });
      expect(areaSelection.minimumMeasure).toBe(2.0);
      expect(areaSelection.maximumMeasure).toBe(16.0);
    });

    it("passes the other options through", () => {
      const areaSelection = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        minimumHeight: 100.0,
        maximumHeight: 200.0,
        minimumGeometricError: 2.0,
        maximumGeometricError: 16.0,
        show: false,
      });
      expect(areaSelection.minimumHeight).toBe(100.0);
      expect(areaSelection.maximumHeight).toBe(200.0);
      expect(areaSelection.show).toBe(false);
    });

    it("uses the tile's geometric error as the measure", () => {
      const areaSelection = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        geometricError: 4.0,
      });
      const tile = { geometricError: 5.0 };
      expect(areaSelection.measure(tile, 0)).toBe(5.0);
    });

    it("shares one measure between areas", () => {
      const first = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        geometricError: 4.0,
      });
      const second = Cesium3DTilesetAreaSelection.fromGeometricError({
        area: rectangle,
        minimumGeometricError: 2.0,
        maximumGeometricError: 16.0,
      });
      expect(first.measure).toBe(second.measure);
    });

    it("throws without a geometric error", () => {
      expect(() =>
        Cesium3DTilesetAreaSelection.fromGeometricError({ area: rectangle }),
      ).toThrowDeveloperError();
    });

    it("throws with both a geometric error and a range", () => {
      expect(() =>
        Cesium3DTilesetAreaSelection.fromGeometricError({
          area: rectangle,
          geometricError: 4.0,
          minimumGeometricError: 2.0,
          maximumGeometricError: 16.0,
        }),
      ).toThrowDeveloperError();
    });

    it("throws with only one end of the range", () => {
      expect(() =>
        Cesium3DTilesetAreaSelection.fromGeometricError({
          area: rectangle,
          minimumGeometricError: 2.0,
        }),
      ).toThrowDeveloperError();
    });
  });
});
