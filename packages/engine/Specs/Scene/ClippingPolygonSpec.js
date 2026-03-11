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
    expect(polygon.ellipsoid).toEqual(Ellipsoid.WGS84);
    expect(polygon.immutable).toBeFalse();
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
      positions: [new Cartesian3(), new Cartesian3(), new Cartesian3()],
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

    polygonB = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
    });

    expect(ClippingPolygon.equals(polygonA, polygonA)).toBeTrue();
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

  it("computeRectangle returns rectangle enclosing the polygon", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    const result = polygon.computeRectangle();
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

  it("computeRectangle uses result parameter", function () {
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

  it("computeSphericalExtents returns rectangle enclosing the polygon defined in spherical coordinates", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    const result = polygon.computeSphericalExtents();
    expect(result).toBeInstanceOf(Rectangle);
    expect(result.west).toEqualEpsilon(
      -1.3191630776640944,
      CesiumMath.EPSILON10,
    );
    expect(result.south).toEqualEpsilon(
      0.6968641167123716,
      CesiumMath.EPSILON10,
    );
    expect(result.east).toEqualEpsilon(
      -1.3191198686316543,
      CesiumMath.EPSILON10,
    );
    expect(result.north).toEqualEpsilon(
      0.6969300470954187,
      CesiumMath.EPSILON10,
    );
  });

  it("computeSphericalExtents uses result parameter", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
    });

    const result = new Rectangle();
    const returnedValue = polygon.computeSphericalExtents(result);
    expect(returnedValue).toBe(result);
    expect(result.west).toEqualEpsilon(
      -1.3191630776640944,
      CesiumMath.EPSILON10,
    );
    expect(result.south).toEqualEpsilon(
      0.6968641167123716,
      CesiumMath.EPSILON10,
    );
    expect(result.east).toEqualEpsilon(
      -1.3191198686316543,
      CesiumMath.EPSILON10,
    );
    expect(result.north).toEqualEpsilon(
      0.6969300470954187,
      CesiumMath.EPSILON10,
    );
  });

  it("constructs an immutable polygon", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
      immutable: true,
    });

    expect(polygon.length).toBe(5);
    expect(polygon.positions).toEqual(positions);
    expect(polygon.ellipsoid).toEqual(Ellipsoid.WGS84);
    expect(polygon.immutable).toBeTrue();

    // Test immutability
    expect(() => {
      polygon.positions[0] = Cartesian3.fromRadians(0, 0);
    }).toThrow();
  });

  it("clones an immutable polygon", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);
    const polygon = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
      immutable: true,
    });
    const clonedPolygon = ClippingPolygon.clone(polygon);
    expect(polygon.positions).toEqual(clonedPolygon.positions);
    expect(polygon.positions).not.toBe(clonedPolygon.positions);
    expect(polygon.ellipsoid).toEqual(clonedPolygon.ellipsoid);
    expect(clonedPolygon.immutable).toBeTrue(); // Result should also be immutable
  });

  it("clones an immutable polygon into an mutable reference", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);
    const polygon = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
      immutable: true,
    });
    const scratchClippingPolygon = new ClippingPolygon({
      positions: [new Cartesian3(), new Cartesian3(), new Cartesian3()],
    });
    const clonedPolygon = ClippingPolygon.clone(
      polygon,
      scratchClippingPolygon,
    );
    expect(polygon.positions).toEqual(clonedPolygon.positions);
    expect(polygon.positions).not.toBe(clonedPolygon.positions);
    expect(polygon.ellipsoid).toEqual(clonedPolygon.ellipsoid);
    expect(clonedPolygon.immutable).toBeFalse(); // Result should still be mutable
  });

  it("clones a polygon into an immutable reference should fail", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);
    const polygon = new ClippingPolygon({
      ellipsoid: Ellipsoid.MOON,
      positions: positions,
    });
    const scratchClippingPolygon = new ClippingPolygon({
      positions: [new Cartesian3(), new Cartesian3(), new Cartesian3()],
      immutable: true,
    });
    expect(() => {
      ClippingPolygon.clone(polygon, scratchClippingPolygon); // We do not support cloning into a immutable object
    }).toThrowError("Cannot clone into an immutable ClippingPolygon");
  });

  it("computeRectangle skips position comparison for immutable polygons on subsequent calls", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions,
      immutable: true,
    });

    // First call populates the cache
    const rectA = polygon.computeRectangle();
    expect(rectA).toBeDefined();

    // Attempt to mutate should fail
    expect(() => {
      polygon.positions[0] = Cartesian3.fromRadians(-1.2, 0.6);
    }).toThrow();

    // Spy on Cartesian3.equals which is called by equalsArrayCartesian3
    const spy = spyOn(Cartesian3, "equals").and.callThrough();

    // Second call should use the frozen fast-path and never compare positions
    const rectB = polygon.computeRectangle();
    expect(spy).not.toHaveBeenCalled();
    expect(Rectangle.equals(rectA, rectB)).toBeTrue();
  });

  it("computeRectangle compares positions for mutable polygons on subsequent calls", function () {
    const positions = Cartesian3.fromRadiansArray([
      -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
      -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
      0.698743632490865, -1.3194358224045408, 0.6987471965556998,
    ]);

    const polygon = new ClippingPolygon({
      positions: positions, // mutable
    });

    // First call populates the cache
    const rectA = polygon.computeRectangle();
    expect(rectA).toBeDefined();

    // Mutate
    polygon.positions[0] = Cartesian3.fromRadians(-1.2, 0.6);

    // Spy on Cartesian3.equals which is called by equalsArrayCartesian3
    const spy = spyOn(Cartesian3, "equals").and.callThrough();

    // Second call must fall through to equalsArrayCartesian3 since positions are mutable
    const rectB = polygon.computeRectangle();
    expect(rectB).toBeDefined();
    expect(spy).toHaveBeenCalled();

    // Rectangles should have changed
    expect(Rectangle.equals(rectA, rectB)).toBeFalse();
  });
});
