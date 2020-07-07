import { Cartesian3 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { WallOutlineGeometry } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/WallOutlineGeometry", function () {
  var ellipsoid = Ellipsoid.WGS84;

  it("throws with no positions", function () {
    expect(function () {
      return new WallOutlineGeometry();
    }).toThrowDeveloperError();
  });

  it("throws when positions and minimumHeights length do not match", function () {
    expect(function () {
      return new WallOutlineGeometry({
        positions: new Array(2),
        minimumHeights: new Array(3),
      });
    }).toThrowDeveloperError();
  });

  it("throws when positions and maximumHeights length do not match", function () {
    expect(function () {
      return new WallOutlineGeometry({
        positions: new Array(2),
        maximumHeights: new Array(3),
      });
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than 2 unique positions", function () {
    var geometry = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          49.0,
          18.0,
          5000.0,
          49.0,
          18.0,
          1000.0,
        ]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("returns undefined with no heights", function () {
    var geometry = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArray([
          49.0,
          18.0,
          49.0,
          18.0,
          49.0,
          18.0,
        ]),
      })
    );
    expect(geometry).toBeUndefined();

    geometry = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArray([
          49.0,
          18.0,
          49.0,
          18.0,
          49.0,
          18.0,
        ]),
        maximumHeights: [0, 0, 0],
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("creates positions relative to ellipsoid", function () {
    var w = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
        ]),
        granularity: Math.PI,
      })
    );

    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(4 * 3);
    expect(w.indices.length).toEqual(4 * 2);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON8);
  });

  it("creates positions with minimum and maximum heights", function () {
    var w = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
        ]),
        minimumHeights: [1000.0, 2000.0],
        maximumHeights: [3000.0, 4000.0],
        granularity: Math.PI,
      })
    );

    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(4 * 3);
    expect(w.indices.length).toEqual(4 * 2);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(3000.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 6)
    );
    expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 9)
    );
    expect(cartographic.height).toEqualEpsilon(4000.0, CesiumMath.EPSILON8);
  });

  it("cleans positions with duplicates", function () {
    var w = WallOutlineGeometry.createGeometry(
      new WallOutlineGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          49.0,
          18.0,
          2000.0,
          50.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          51.0,
          18.0,
          1000.0,
          51.0,
          18.0,
          1000.0,
        ]),
      })
    );

    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(6 * 3);
    expect(w.indices.length).toEqual(7 * 2); //3 vertical + 4 horizontal

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);
  });

  it("fromConstantHeights throws without positions", function () {
    expect(function () {
      return WallOutlineGeometry.fromConstantHeights();
    }).toThrowDeveloperError();
  });

  it("creates positions with constant minimum and maximum heights", function () {
    var min = 1000.0;
    var max = 2000.0;

    var w = WallOutlineGeometry.createGeometry(
      WallOutlineGeometry.fromConstantHeights({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
        ]),
        minimumHeight: min,
        maximumHeight: max,
      })
    );

    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(4 * 3);
    expect(w.indices.length).toEqual(4 * 2);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 6)
    );
    expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 9)
    );
    expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);
  });

  var positions = [
    new Cartesian3(1.0, 0.0, 0.0),
    new Cartesian3(0.0, 1.0, 0.0),
    new Cartesian3(0.0, 0.0, 1.0),
  ];
  var wall = new WallOutlineGeometry({
    positions: positions,
    granularity: 0.01,
    ellipsoid: Ellipsoid.UNIT_SPHERE,
  });
  var packedInstance = [
    3.0,
    1.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    1.0,
    1.0,
    1.0,
    0.01,
  ];
  createPackableSpecs(WallOutlineGeometry, wall, packedInstance);
});
