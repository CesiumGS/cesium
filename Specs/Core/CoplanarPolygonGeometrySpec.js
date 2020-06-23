import { Cartesian3 } from "../../Source/Cesium.js";
import { CoplanarPolygonGeometry } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/CoplanarPolygonGeometry", function () {
  it("throws with no hierarchy", function () {
    expect(function () {
      return new CoplanarPolygonGeometry();
    }).toThrowDeveloperError();
  });

  it("fromPositions throws without positions", function () {
    expect(function () {
      return CoplanarPolygonGeometry.fromPositions();
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than 3 unique positions", function () {
    var geometry = CoplanarPolygonGeometry.createGeometry(
      CoplanarPolygonGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          49.0,
          18.0,
          5000.0,
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

  it("returns undefined when positions are linear", function () {
    var geometry = CoplanarPolygonGeometry.createGeometry(
      CoplanarPolygonGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArrayHeights([
          0.0,
          0.0,
          1.0,
          0.0,
          0.0,
          2.0,
          0.0,
          0.0,
          3.0,
        ]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns undefined due to duplicate hierarchy positions", function () {
    var hierarchy = {
      positions: Cartesian3.fromDegreesArray([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
          ]),
        },
      ],
    };

    var geometry = CoplanarPolygonGeometry.createGeometry(
      new CoplanarPolygonGeometry({ polygonHierarchy: hierarchy })
    );
    expect(geometry).toBeUndefined();
  });

  it("computes positions", function () {
    var p = CoplanarPolygonGeometry.createGeometry(
      CoplanarPolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArrayHeights([
          -1.0,
          -1.0,
          0.0,
          -1.0,
          0.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          2.0,
          0.0,
        ]),
      })
    );

    expect(p.attributes.position.values.length).toEqual(4 * 3);
    expect(p.indices.length).toEqual(2 * 3);
  });

  it("computes all attributes", function () {
    var p = CoplanarPolygonGeometry.createGeometry(
      CoplanarPolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArrayHeights([
          -1.0,
          -1.0,
          0.0,
          -1.0,
          0.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          2.0,
          0.0,
        ]),
      })
    );

    var numVertices = 4;
    var numTriangles = 2;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.attributes.st.values.length).toEqual(numVertices * 2);
    expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("flips normal to roughly match surface normal", function () {
    var p = CoplanarPolygonGeometry.createGeometry(
      CoplanarPolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArrayHeights([
          90.0,
          -1.0,
          0.0,
          90.0,
          1.0,
          0.0,
          92.0,
          1.0,
          0.0,
          92.0,
          -1.0,
          0.0,
        ]),
      })
    );

    var center = Cartesian3.fromDegrees(91.0, 0.0);
    var expectedNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(center);

    var actual = Cartesian3.unpack(p.attributes.normal.values);

    expect(expectedNormal).toEqualEpsilon(actual, CesiumMath.EPSILON6);
  });

  var positions = Cartesian3.fromDegreesArray([
    -12.4,
    3.5,
    -12.0,
    3.5,
    -12.0,
    4.0,
  ]);
  var holePositions0 = Cartesian3.fromDegreesArray([
    -12.2,
    3.5,
    -12.2,
    3.6,
    -12.3,
    3.6,
  ]);
  var holePositions1 = Cartesian3.fromDegreesArray([
    -12.2,
    3.5,
    -12.25,
    3.5,
    -12.25,
    3.55,
  ]);
  var hierarchy = {
    positions: positions,
    holes: [
      {
        positions: holePositions0,
        holes: [
          {
            positions: holePositions1,
            holes: undefined,
          },
        ],
      },
    ],
  };

  var polygon = new CoplanarPolygonGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    polygonHierarchy: hierarchy,
  });

  function addPositions(array, positions) {
    for (var i = 0; i < positions.length; ++i) {
      array.push(positions[i].x, positions[i].y, positions[i].z);
    }
  }

  var packedInstance = [3.0, 1.0];
  addPositions(packedInstance, positions);
  packedInstance.push(3.0, 1.0);
  addPositions(packedInstance, holePositions0);
  packedInstance.push(3.0, 0.0);
  addPositions(packedInstance, holePositions1);
  packedInstance.push(
    Ellipsoid.WGS84.radii.x,
    Ellipsoid.WGS84.radii.y,
    Ellipsoid.WGS84.radii.z
  );
  packedInstance.push(1, 0, 0, 0, 0, 0, 0, 44);
  createPackableSpecs(CoplanarPolygonGeometry, polygon, packedInstance);
});
