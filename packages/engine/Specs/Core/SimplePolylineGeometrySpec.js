import {
  ArcType,
  BoundingSphere,
  Cartesian3,
  Color,
  Ellipsoid,
  PrimitiveType,
  SimplePolylineGeometry,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/SimplePolylineGeometry", function () {
  it("constructor throws with no positions", function () {
    expect(function () {
      return new SimplePolylineGeometry();
    }).toThrowDeveloperError();
  });

  it("constructor throws with less than two positions", function () {
    expect(function () {
      return new SimplePolylineGeometry({
        positions: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid number of colors", function () {
    expect(function () {
      return new SimplePolylineGeometry({
        positions: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
        colors: [],
      });
    }).toThrowDeveloperError();
  });

  it("constructor computes all vertex attributes", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.position.values).toEqualEpsilon(
      [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
      CesiumMath.EPSILON10
    );
    expect(line.indices).toEqual([0, 1, 1, 2]);
    expect(line.primitiveType).toEqual(PrimitiveType.LINES);
    expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
  });

  it("constructor computes all vertex attributes for rhumb lines", function () {
    const positions = Cartesian3.fromDegreesArray([30, 30, 30, 60, 60, 60]);
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
        arcType: ArcType.RHUMB,
      })
    );

    const cartesian3Array = [];
    Cartesian3.packArray(positions, cartesian3Array);

    expect(line.attributes.position.values).toEqualEpsilon(
      cartesian3Array,
      CesiumMath.EPSILON8
    );
    expect(line.indices).toEqual([0, 1, 1, 2]);
    expect(line.primitiveType).toEqual(PrimitiveType.LINES);
    expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
  });

  it("constructor computes per segment colors", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        colors: colors,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length * 2 - 2;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  it("constructor computes per vertex colors", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        colors: colors,
        colorsPerVertex: true,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  it("constructor computes all vertex attributes, no subdivision", function () {
    const positions = [
      new Cartesian3(),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(2.0, 0.0, 0.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        arcType: ArcType.NONE,
      })
    );

    expect(line.attributes.position.values).toEqual([
      0.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      2.0,
      0.0,
      0.0,
    ]);
    expect(line.indices).toEqual([0, 1, 1, 2]);
    expect(line.primitiveType).toEqual(PrimitiveType.LINES);
    expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
  });

  it("constructor computes per segment colors, no subdivision", function () {
    const positions = [
      new Cartesian3(),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(2.0, 0.0, 0.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        colors: colors,
        arcType: ArcType.NONE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length * 2 - 2;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  it("constructor computes per vertex colors, no subdivision", function () {
    const positions = [
      new Cartesian3(),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(2.0, 0.0, 0.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = SimplePolylineGeometry.createGeometry(
      new SimplePolylineGeometry({
        positions: positions,
        colors: colors,
        colorsPerVertex: true,
        arcType: ArcType.NONE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  const positions = [
    new Cartesian3(1, 2, 3),
    new Cartesian3(4, 5, 6),
    new Cartesian3(7, 8, 9),
  ];
  let line = new SimplePolylineGeometry({
    positions: positions,
    colors: [Color.RED, Color.LIME, Color.BLUE],
    colorsPerVertex: true,
    arcType: ArcType.NONE,
    granularity: 11,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  let packedInstance = [
    3,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    3,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    1,
    0,
    0,
    1,
    1,
    12,
    13,
    14,
    1,
    0,
    11,
  ];
  createPackableSpecs(
    SimplePolylineGeometry,
    line,
    packedInstance,
    "per vertex colors"
  );

  line = new SimplePolylineGeometry({
    positions: positions,
    colorsPerVertex: false,
    arcType: ArcType.NONE,
    granularity: 11,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 0, 0, 11];
  createPackableSpecs(SimplePolylineGeometry, line, packedInstance);

  line = new SimplePolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.GEODESIC,
    granularity: 11,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 0, 1, 11];
  createPackableSpecs(
    SimplePolylineGeometry,
    line,
    packedInstance,
    "geodesic line"
  );

  line = new SimplePolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.RHUMB,
    granularity: 11,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 0, 2, 11];
  createPackableSpecs(
    SimplePolylineGeometry,
    line,
    packedInstance,
    "rhumb line"
  );

  line = new SimplePolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.NONE,
    granularity: 11,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 0, 0, 11];
  createPackableSpecs(
    SimplePolylineGeometry,
    line,
    packedInstance,
    "straight line"
  );
});
