import { Cartesian3 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import { WallGeometry } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/WallGeometry", function () {
  var ellipsoid = Ellipsoid.WGS84;

  it("throws with no positions", function () {
    expect(function () {
      return new WallGeometry();
    }).toThrowDeveloperError();
  });

  it("throws when positions and minimumHeights length do not match", function () {
    expect(function () {
      return new WallGeometry({
        positions: new Array(2),
        minimumHeights: new Array(3),
      });
    }).toThrowDeveloperError();
  });

  it("throws when positions and maximumHeights length do not match", function () {
    expect(function () {
      return new WallGeometry({
        positions: new Array(2),
        maximumHeights: new Array(3),
      });
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than 2 unique positions", function () {
    var geometry = WallGeometry.createGeometry(
      new WallGeometry({
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
    var geometry = WallGeometry.createGeometry(
      new WallGeometry({
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

    geometry = WallGeometry.createGeometry(
      new WallGeometry({
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

  it("does not create when minimumHeights and maximumHeights are the same", function () {
    var geometry = WallGeometry.createGeometry(
      new WallGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          -115.0,
          44.0,
          100000.0,
          -90.0,
          44.0,
          200000.0,
          -30.0,
          44.0,
          200000.0,
        ]),
        maximumHeights: [60000.0, 60000.0, 50000.0],
        minimumHeights: [60000.0, 60000.0, 50000.0],
      })
    );

    expect(geometry).toBeUndefined();
  });

  it("does not create when removing duplicated position results in minimumHeights and maximumHeights are the same", function () {
    var geometry = WallGeometry.createGeometry(
      new WallGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          -115.0,
          44.0,
          200000.0,
          -115.0,
          44.0,
          100000.0,
          -90.0,
          44.0,
          200000.0,
          -30.0,
          44.0,
          200000.0,
        ]),
        maximumHeights: [40000.0, 60000.0, 60000.0, 50000.0],
        minimumHeights: [60000.0, 60000.0, 60000.0, 50000.0],
      })
    );

    expect(geometry).toBeUndefined();
  });

  it("does not throw when positions are unique but close", function () {
    WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -47.93121266896352,
          -15.771192496304398,
          -47.93119792786269,
          -15.771148001875085,
        ]),
      })
    );
  });

  it("creates positions relative to ellipsoid", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
        ]),
      })
    );

    var positions = w.attributes.position.values;
    var numPositions = 4;
    var numTriangles = 2;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);

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
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
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
      })
    );

    var positions = w.attributes.position.values;
    var numPositions = 4;
    var numTriangles = 2;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);

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

  it("create positions with negative height", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
        ]),
        maximumHeights: [-300.0, -200.0],
        minimumHeights: [-500.0, -600.0],
      })
    );

    var positions = w.attributes.position.values;
    var normals = w.attributes.normal.values;
    var indices = w.indices;
    var numPositions = 4;
    var numTriangles = 2;
    expect(positions.length).toEqual(numPositions * 3);
    expect(normals.length).toEqual(numPositions * 3);
    expect(indices.length).toEqual(numTriangles * 3);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(-500.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(-300.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 6)
    );
    expect(cartographic.height).toEqualEpsilon(-600.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 9)
    );
    expect(cartographic.height).toEqualEpsilon(-200.0, CesiumMath.EPSILON8);

    var bottomPosition = Cartesian3.fromArray(positions, 0);
    var topPosition = Cartesian3.fromArray(positions, 3);
    var nextTopPosition = Cartesian3.fromArray(positions, 9);
    var topDiff = Cartesian3.subtract(
      nextTopPosition,
      topPosition,
      new Cartesian3()
    );
    var bottomDiff = Cartesian3.subtract(
      bottomPosition,
      topPosition,
      new Cartesian3()
    );
    var expectedNormal = Cartesian3.cross(
      bottomDiff,
      topDiff,
      new Cartesian3()
    );
    Cartesian3.normalize(expectedNormal, expectedNormal);

    var length = normals.length;
    for (var i = 0; i < length; i += 3) {
      expect(normals[i]).toEqualEpsilon(expectedNormal.x, CesiumMath.EPSILON7);
      expect(normals[i + 1]).toEqualEpsilon(
        expectedNormal.y,
        CesiumMath.EPSILON7
      );
      expect(normals[i + 2]).toEqualEpsilon(
        expectedNormal.z,
        CesiumMath.EPSILON7
      );
    }
  });

  it("No zero unit normals, tangent, or bitangent created when only part of minimumHeights and maximumHeights array are equal", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          51.0,
          18.0,
          1000.0,
          52.0,
          18.0,
          1000.0,
        ]),
        maximumHeights: [0.0, -300.0, 0.0, 10.0],
        minimumHeights: [0.0, -300.0, -10.0, -20.0],
      })
    );

    var normals = w.attributes.normal.values;
    var tangents = w.attributes.tangent.values;
    var bitangents = w.attributes.bitangent.values;
    var normal = Cartesian3.fromArray(normals, 0);
    var tangent = Cartesian3.fromArray(tangents, 0);
    var bitangent = Cartesian3.fromArray(bitangents, 0);
    expect(Cartesian3.equalsEpsilon(normal, Cartesian3.UNIT_Y)).toEqual(true);
    expect(Cartesian3.equalsEpsilon(tangent, Cartesian3.UNIT_X)).toEqual(true);
    expect(Cartesian3.equalsEpsilon(bitangent, Cartesian3.UNIT_Z)).toEqual(
      true
    );

    var length = normals.length;
    for (var i = 3; i < length; i += 3) {
      normal = Cartesian3.fromArray(normals, i, normal);
      tangent = Cartesian3.fromArray(tangents, i, tangent);
      bitangent = Cartesian3.fromArray(bitangents, i, bitangents);
      var normalLength = Cartesian3.magnitude(normal);
      var tangentLength = Cartesian3.magnitude(tangent);
      var bitangentLength = Cartesian3.magnitude(bitangent);
      var normalTangentAngle = Cartesian3.dot(normal, tangent);
      var normalBitangentAngle = Cartesian3.dot(normal, bitangent);
      var tangentBitangentAngle = Cartesian3.dot(tangent, bitangent);

      expect(
        CesiumMath.equalsEpsilon(normalLength, 0.0, CesiumMath.EPSILON7)
      ).toEqual(false);

      expect(
        CesiumMath.equalsEpsilon(tangentLength, 0.0, CesiumMath.EPSILON7)
      ).toEqual(false);

      expect(
        CesiumMath.equalsEpsilon(bitangentLength, 0.0, CesiumMath.EPSILON7)
      ).toEqual(false);

      expect(normalTangentAngle).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
      expect(normalBitangentAngle).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
      expect(tangentBitangentAngle).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    }
  });

  it("cleans positions with duplicates", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
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

    var numPositions = 8;
    var numTriangles = 4;
    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 3)
    );
    expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);
  });

  it("removes duplicates with very small difference", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: [
          new Cartesian3(
            4347090.215457887,
            1061403.4237998386,
            4538066.036525028
          ),
          new Cartesian3(
            4348147.589624987,
            1043897.8776143644,
            4541092.234751661
          ),
          new Cartesian3(
            4348147.589882754,
            1043897.8776762491,
            4541092.234492364
          ),
          new Cartesian3(
            4335659.882947743,
            1047571.602084736,
            4552098.654605664
          ),
        ],
      })
    );

    var numPositions = 8;
    var numTriangles = 4;
    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);
  });

  it("does not clean positions that add up past EPSILON10", function () {
    var eightyPercentOfEpsilon14 = 0.8 * CesiumMath.EPSILON10;
    var inputPositions = Cartesian3.fromRadiansArrayHeights([
      1.0,
      1.0,
      1000.0,
      1.0,
      1.0 + eightyPercentOfEpsilon14,
      1000.0,
      1.0,
      1.0 + 2 * eightyPercentOfEpsilon14,
      1000.0,
      1.0,
      1.0 + 3 * eightyPercentOfEpsilon14,
      1000.0,
    ]);
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: inputPositions,
      })
    );
    expect(w).toBeDefined();

    var expectedPositions = Cartesian3.fromRadiansArrayHeights([
      1.0,
      1.0,
      1000.0,
      1.0,
      1.0 + 2 * eightyPercentOfEpsilon14,
      1000.0,
    ]);
    var expectedW = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: expectedPositions,
      })
    );
    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(
      expectedW.attributes.position.values.length
    );
  });

  it("cleans selects maximum height from duplicates", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          6000.0,
          50.0,
          18.0,
          10000.0,
          51.0,
          18.0,
          1000.0,
        ]),
      })
    );

    var numPositions = 8;
    var numTriangles = 4;
    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);

    var cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 0)
    );
    expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

    cartographic = ellipsoid.cartesianToCartographic(
      Cartesian3.fromArray(positions, 9)
    );
    expect(cartographic.height).toEqualEpsilon(10000.0, CesiumMath.EPSILON8);
  });

  it("creates all attributes", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          51.0,
          18.0,
          1000.0,
        ]),
      })
    );

    var numPositions = 8;
    var numTriangles = 4;
    expect(w.attributes.position.values.length).toEqual(numPositions * 3);
    expect(w.attributes.normal.values.length).toEqual(numPositions * 3);
    expect(w.attributes.tangent.values.length).toEqual(numPositions * 3);
    expect(w.attributes.bitangent.values.length).toEqual(numPositions * 3);
    expect(w.attributes.st.values.length).toEqual(numPositions * 2);
    expect(w.indices.length).toEqual(numTriangles * 3);
  });

  it("creates correct texture coordinates", function () {
    var w = WallGeometry.createGeometry(
      new WallGeometry({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          50.0,
          18.0,
          1000.0,
          51.0,
          18.0,
          1000.0,
        ]),
      })
    );

    expect(w.attributes.st.values.length).toEqual(4 * 2 * 2);
    expect(w.attributes.st.values).toEqual([
      0.0,
      0.0,
      0.0,
      1.0,
      0.5,
      0.0,
      0.5,
      1.0,
      0.5,
      0.0,
      0.5,
      1.0,
      1.0,
      0.0,
      1.0,
      1.0,
    ]);
  });

  it("fromConstantHeights throws without positions", function () {
    expect(function () {
      return WallGeometry.fromConstantHeights();
    }).toThrowDeveloperError();
  });

  it("creates positions with constant minimum and maximum heights", function () {
    var min = 1000.0;
    var max = 2000.0;

    var w = WallGeometry.createGeometry(
      WallGeometry.fromConstantHeights({
        vertexFormat: VertexFormat.POSITION_ONLY,
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

    var numPositions = 4;
    var numTriangles = 2;
    var positions = w.attributes.position.values;
    expect(positions.length).toEqual(numPositions * 3);
    expect(w.indices.length).toEqual(numTriangles * 3);

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
  var wall = new WallGeometry({
    positions: positions,
    vertexFormat: VertexFormat.POSITION_ONLY,
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
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.01,
  ];
  createPackableSpecs(WallGeometry, wall, packedInstance);
});
