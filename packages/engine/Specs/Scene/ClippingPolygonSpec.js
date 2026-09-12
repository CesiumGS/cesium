import {
  Cartesian3,
  ClippingPolygon,
  Ellipsoid,
  Math as CesiumMath,
  Rectangle,
} from "../../index.js";

describe("Scene/ClippingPolygon", function () {
  it("constructs", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    expect(polygon.length).toBe(5);
    expect(polygon.positions).toEqual(positions);
    expect(polygon.holes).toEqual([]);
    expect(polygon.ellipsoid).toEqual(Ellipsoid.WGS84);
  });

  it("constructs with holes", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);
    const hole = Cartesian3.fromRadiansArray([
      -1.31942, 0.69879, -1.319405, 0.69879, -1.319412, 0.698763,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
      holes: [hole],
    });

    expect(polygon.positions).toEqual(positions);
    expect(polygon.holes.length).toBe(1);
    expect(polygon.holes[0]).toEqual(hole);
    expect(polygon.holes[0]).not.toBe(hole);
    // length counts the outer ring plus every hole vertex.
    expect(polygon.length).toBe(positions.length + hole.length);
  });

  it("clones holes", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);
    const hole = Cartesian3.fromRadiansArray([
      -1.31942, 0.69879, -1.319405, 0.69879, -1.319412, 0.698763,
    ]);

    const polygon = new ClippingPolygon({ positions, holes: [hole] });
    const cloned = ClippingPolygon.clone(polygon);
    expect(cloned.holes.length).toBe(1);
    expect(cloned.holes[0]).toEqual(hole);
    expect(cloned.holes[0]).not.toBe(polygon.holes[0]);
  });

  it("throws when constructing polygon with fewer than 3 positions", function () {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const polygon = new ClippingPolygon();
    }).toThrowDeveloperError();

    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
    ]);

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const polygon = new ClippingPolygon({
        positions: positions,
      });
    }).toThrowDeveloperError();
  });

  it("clones", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
    });
    let clonedPolygon = ClippingPolygon.clone(polygon);
    expect(polygon.positions).toEqual(clonedPolygon.positions);
    expect(polygon.positions).not.toBe(clonedPolygon.positions);
    expect(polygon.ellipsoid).toEqual(clonedPolygon.ellipsoid);

    const scratchClippingPolygon = new ClippingPolygon({
      positions: positions,
    });
    clonedPolygon = ClippingPolygon.clone(polygon, scratchClippingPolygon);
    expect(polygon.positions).toEqual(clonedPolygon.positions);
    expect(polygon.positions).not.toBe(clonedPolygon.positions);
    expect(polygon.ellipsoid).toEqual(clonedPolygon.ellipsoid);
  });

  it("clone throws without argument", function () {
    expect(() => {
      ClippingPolygon.clone(undefined);
    }).toThrowDeveloperError();
  });

  it("equals verifies equality", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygonA = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
    });

    let polygonB = new ClippingPolygon({
      positions: positions,
    });

    expect(ClippingPolygon.equals(polygonA, polygonB)).toBeFalse();

    polygonB = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: Cartesian3.fromRadiansArray([
        -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
        -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
        0.698743632490865, -1.3194358224045408, 0.6987471965556998,
      ]),
    });

    expect(ClippingPolygon.equals(polygonA, polygonB)).toBeFalse();

    // ClippingPolygon instances cannot be equal, because they are
    // creating a copy of the input positions, and the 'equals'
    // implementation is checking for "===" (identity) of the
    // arrays. See https://github.com/CesiumGS/cesium/issues/12389
    polygonB = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
    });
    expect(ClippingPolygon.equals(polygonA, polygonB)).toBeFalse();
  });

  it("equals throws without arguments", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    expect(() => {
      ClippingPolygon.equals(polygon, undefined);
    }).toThrowDeveloperError();
    expect(() => {
      ClippingPolygon.equals(undefined, polygon);
    }).toThrowDeveloperError();
  });

  it("rectangle getter returns rectangle enclosing the polygon", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    const result = polygon.rectangle;
    expect(result).toBeInstanceOf(Rectangle);
    expect(result.west).toEqualEpsilon(
      -1.3194369277314024,
      CesiumMath.EPSILON10,
    );
    expect(result.south).toEqualEpsilon(
      0.6987436324908647,
      CesiumMath.EPSILON10,
    );
    expect(result.east).toEqualEpsilon(
      -1.3193931220959367,
      CesiumMath.EPSILON10,
    );
    expect(result.north).toEqualEpsilon(
      0.6988091578771254,
      CesiumMath.EPSILON10,
    );
  });

  it("computeRectangle is deprecated but still returns a clone", function () {
    spyOn(console, "warn");
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    const result = new Rectangle();
    const returnedValue = polygon.computeRectangle(result);
    expect(returnedValue).toBe(result);
    expect(returnedValue).not.toBe(polygon.rectangle);
    expect(returnedValue).toEqual(polygon.rectangle);
  });

  it("freezes positions so the geometry is immutable", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254,
    ]);
    const hole = Cartesian3.fromRadiansArray([
      -1.31942, 0.69879, -1.319405, 0.69879, -1.319412, 0.698763,
    ]);
    const polygon = new ClippingPolygon({ positions, holes: [hole] });

    expect(Object.isFrozen(polygon.positions)).toBeTrue();
    expect(Object.isFrozen(polygon.holes)).toBeTrue();
    expect(Object.isFrozen(polygon.holes[0])).toBeTrue();

    expect(() => {
      polygon.positions[0].x = 1.0;
    }).toThrow();
    expect(() => {
      polygon.positions.push(new Cartesian3());
    }).toThrow();
    expect(() => {
      polygon.holes[0][0].x = 1.0;
    }).toThrow();
  });
});
