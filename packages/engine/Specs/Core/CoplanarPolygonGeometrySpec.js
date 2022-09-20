import {
  Cartesian3,
  Cartesian2,
  CoplanarPolygonGeometry,
  Ellipsoid,
  VertexFormat,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

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
    const geometry = CoplanarPolygonGeometry.createGeometry(
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
    const geometry = CoplanarPolygonGeometry.createGeometry(
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
    const hierarchy = {
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

    const geometry = CoplanarPolygonGeometry.createGeometry(
      new CoplanarPolygonGeometry({ polygonHierarchy: hierarchy })
    );
    expect(geometry).toBeUndefined();
  });

  it("computes positions", function () {
    const p = CoplanarPolygonGeometry.createGeometry(
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
    const p = CoplanarPolygonGeometry.createGeometry(
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

    const numVertices = 4;
    const numTriangles = 2;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.attributes.st.values.length).toEqual(numVertices * 2);
    expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("flips normal to roughly match surface normal", function () {
    const p = CoplanarPolygonGeometry.createGeometry(
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

    const center = Cartesian3.fromDegrees(91.0, 0.0);
    const expectedNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(center);

    const actual = Cartesian3.unpack(p.attributes.normal.values);

    expect(expectedNormal).toEqualEpsilon(actual, CesiumMath.EPSILON6);
  });

  // pack without explicit texture coordinates

  const positions = Cartesian3.fromDegreesArray([
    -12.4,
    3.5,
    -12.0,
    3.5,
    -12.0,
    4.0,
  ]);
  const holePositions0 = Cartesian3.fromDegreesArray([
    -12.2,
    3.5,
    -12.2,
    3.6,
    -12.3,
    3.6,
  ]);
  const holePositions1 = Cartesian3.fromDegreesArray([
    -12.2,
    3.5,
    -12.25,
    3.5,
    -12.25,
    3.55,
  ]);
  const hierarchy = {
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

  const polygon = new CoplanarPolygonGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    polygonHierarchy: hierarchy,
  });

  function addPositions(array, positions) {
    for (let i = 0; i < positions.length; ++i) {
      array.push(positions[i].x, positions[i].y, positions[i].z);
    }
  }

  function addPositions2D(array, positions) {
    for (let i = 0; i < positions.length; ++i) {
      array.push(positions[i].x, positions[i].y);
    }
  }

  const packedInstance = [3.0, 1.0];
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
  packedInstance.push(1, 0, 0, 0, 0, 0, 0, -1, 45);
  createPackableSpecs(CoplanarPolygonGeometry, polygon, packedInstance);

  // pack with explicit texture coordinates

  const textureCoordinates = {
    positions: [
      new Cartesian2(0, 0),
      new Cartesian2(1, 0),
      new Cartesian2(0, 1),
      new Cartesian2(0.1, 0.1),
      new Cartesian2(0.5, 0.1),
      new Cartesian2(0.1, 0.5),
      new Cartesian2(0.2, 0.2),
      new Cartesian2(0.3, 0.2),
      new Cartesian2(0.2, 0.3),
    ],
    holes: undefined,
  };

  const polygonTextured = new CoplanarPolygonGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    polygonHierarchy: hierarchy,
    textureCoordinates: textureCoordinates,
  });

  const packedInstanceTextured = [3.0, 1.0];
  addPositions(packedInstanceTextured, positions);
  packedInstanceTextured.push(3.0, 1.0);
  addPositions(packedInstanceTextured, holePositions0);
  packedInstanceTextured.push(3.0, 0.0);
  addPositions(packedInstanceTextured, holePositions1);
  packedInstanceTextured.push(
    Ellipsoid.WGS84.radii.x,
    Ellipsoid.WGS84.radii.y,
    Ellipsoid.WGS84.radii.z
  );
  packedInstanceTextured.push(1, 0, 0, 0, 0, 0, 0);
  packedInstanceTextured.push(9.0, 0.0);
  addPositions2D(packedInstanceTextured, textureCoordinates.positions);
  packedInstanceTextured.push(64);
  createPackableSpecs(
    CoplanarPolygonGeometry,
    polygonTextured,
    packedInstanceTextured
  );
});
