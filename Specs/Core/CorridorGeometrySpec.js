import { Cartesian3 } from "../../Source/Cesium.js";
import { CornerType } from "../../Source/Cesium.js";
import { CorridorGeometry } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/CorridorGeometry", function () {
  it("throws without positions", function () {
    expect(function () {
      return new CorridorGeometry({});
    }).toThrowDeveloperError();
  });

  it("throws without width", function () {
    expect(function () {
      return new CorridorGeometry({
        positions: [new Cartesian3()],
      });
    }).toThrowDeveloperError();
  });

  it("createGeometry returns undefined without 2 unique positions", function () {
    let geometry = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -30.0]),
        width: 10000,
      })
    );
    expect(geometry).toBeUndefined();

    geometry = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        positions: [
          new Cartesian3(
            -1349511.388149118,
            -5063973.22857992,
            3623141.6372688496
          ), //same lon/lat, different height
          new Cartesian3(
            -1349046.4811926484,
            -5062228.688739784,
            3621885.0521561056
          ),
        ],
        width: 10000,
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("computes positions", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
      })
    );

    const numVertices = 12; //6 left + 6 right
    const numTriangles = 10; //5 segments x 2 triangles per segment
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("compute all vertex attributes", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
      })
    );

    const numVertices = 12;
    const numTriangles = 10;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions extruded", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
        extrudedHeight: 30000,
      })
    );

    const numVertices = 72; // 6 positions x 4 for a box at each position x 3 to duplicate for normals
    const numTriangles = 44; // 5 segments * 8 triangles per segment + 2 triangles x 2 ends
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("compute all vertex attributes extruded", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
        extrudedHeight: 30000,
      })
    );

    const numVertices = 72;
    const numTriangles = 44;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes offset attribute", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 12;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
        extrudedHeight: 30000,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 72;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length)
      .fill(0)
      .fill(1, 0, 12)
      .fill(1, 24, 48);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -35.0]),
        cornerType: CornerType.MITERED,
        width: 30000,
        extrudedHeight: 30000,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 72;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes right turn", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          91.0,
          -31.0,
        ]),
        cornerType: CornerType.MITERED,
        width: 30000,
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3); // 4 left + 4 right
    expect(m.indices.length).toEqual(6 * 3); // 3 segments * 2 triangles per segment
  });

  it("computes left turn", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
        ]),
        cornerType: CornerType.MITERED,
        width: 30000,
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(6 * 3);
  });

  it("computes with rounded corners", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        positions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
          89.0,
          -32.0,
        ]),
        cornerType: CornerType.ROUNDED,
        width: 30000,
      })
    );

    const endCaps = 72; // 36 points * 2 end caps
    const corners = 37; // 18 for one corner + 19 for the other
    const numVertices = 10 + endCaps + corners;
    const numTriangles = 8 + endCaps + corners;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes with beveled corners", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
          89.0,
          -32.0,
        ]),
        cornerType: CornerType.BEVELED,
        width: 30000,
      })
    );

    expect(m.attributes.position.values.length).toEqual(10 * 3);
    expect(m.indices.length).toEqual(8 * 3);
  });

  it("computes sharp turns", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          2.00571672577652,
          52.7781459942399,
          1.99188457974115,
          52.7764958852886,
          2.01325961458495,
          52.7674170680511,
          1.98708058340534,
          52.7733979856253,
          2.00634853946644,
          52.7650460748473,
        ]),
        cornerType: CornerType.BEVELED,
        width: 100,
      })
    );

    expect(m.attributes.position.values.length).toEqual(13 * 3); // 3 points * 3 corners + 2 points * 2 ends
    expect(m.indices.length).toEqual(11 * 3); // 4 segments * 2 triangles + 3 corners * 1 triangle
  });

  it("computes straight corridors", function () {
    const m = CorridorGeometry.createGeometry(
      new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -67.655,
          0.0,
          -67.655,
          15.0,
          -67.655,
          20.0,
        ]),
        cornerType: CornerType.BEVELED,
        width: 400000,
        granularity: Math.PI / 6.0,
      })
    );

    expect(m.attributes.position.values.length).toEqual(4 * 3);
    expect(m.indices.length).toEqual(2 * 3);
  });

  it(
    "undefined is returned if there are less than two positions or the width is equal to " +
      "or less than zero",
    function () {
      const corridor0 = new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([-72.0, 35.0]),
        width: 100000,
      });
      const corridor1 = new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -67.655,
          0.0,
          -67.655,
          15.0,
          -67.655,
          20.0,
        ]),
        width: 0,
      });
      const corridor2 = new CorridorGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -67.655,
          0.0,
          -67.655,
          15.0,
          -67.655,
          20.0,
        ]),
        width: -100,
      });

      const geometry0 = CorridorGeometry.createGeometry(corridor0);
      const geometry1 = CorridorGeometry.createGeometry(corridor1);
      const geometry2 = CorridorGeometry.createGeometry(corridor2);

      expect(geometry0).toBeUndefined();
      expect(geometry1).toBeUndefined();
      expect(geometry2).toBeUndefined();
    }
  );

  it("computing rectangle property", function () {
    const c = new CorridorGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      positions: Cartesian3.fromDegreesArray([
        -67.655,
        0.0,
        -67.655,
        15.0,
        -67.655,
        20.0,
      ]),
      cornerType: CornerType.MITERED,
      width: 1,
      granularity: Math.PI / 6.0,
    });

    const r = c.rectangle;
    expect(CesiumMath.toDegrees(r.north)).toEqualEpsilon(
      20.0,
      CesiumMath.EPSILON13
    );
    expect(CesiumMath.toDegrees(r.south)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON20
    );
    expect(CesiumMath.toDegrees(r.east)).toEqual(-67.65499522658291);
    expect(CesiumMath.toDegrees(r.west)).toEqual(-67.6550047734171);
  });

  it("computeRectangle", function () {
    const options = {
      vertexFormat: VertexFormat.POSITION_ONLY,
      positions: Cartesian3.fromDegreesArray([
        -67.655,
        0.0,
        -67.655,
        15.0,
        -67.655,
        20.0,
      ]),
      cornerType: CornerType.MITERED,
      width: 1,
    };
    const geometry = new CorridorGeometry(options);

    const expected = geometry.rectangle;
    const result = CorridorGeometry.computeRectangle(options);

    expect(result).toEqual(expected);
  });

  it("computeRectangle with result parameter", function () {
    const options = {
      positions: Cartesian3.fromDegreesArray([
        72.0,
        0.0,
        85.0,
        15.0,
        83.0,
        20.0,
      ]),
      width: 5,
    };
    const geometry = new CorridorGeometry(options);

    const result = new Rectangle();
    const expected = geometry.rectangle;
    const returned = CorridorGeometry.computeRectangle(options, result);

    expect(returned).toEqual(expected);
    expect(returned).toBe(result);
  });

  it("computing textureCoordinateRotationPoints property", function () {
    const c = new CorridorGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      positions: Cartesian3.fromDegreesArray([
        -67.655,
        0.0,
        -67.655,
        15.0,
        -67.655,
        20.0,
      ]),
      cornerType: CornerType.MITERED,
      width: 1,
      granularity: Math.PI / 6.0,
    });

    // Corridors don't support geometry orientation or stRotation, so expect this to equal the original coordinate system.
    const textureCoordinateRotationPoints = c.textureCoordinateRotationPoints;
    expect(textureCoordinateRotationPoints.length).toEqual(6);
    expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
  });

  const positions = Cartesian3.fromDegreesArray([90.0, -30.0, 90.0, -31.0]);
  const corridor = new CorridorGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    positions: positions,
    cornerType: CornerType.BEVELED,
    width: 30000.0,
    granularity: 0.1,
  });

  const packedInstance = [
    2,
    positions[0].x,
    positions[0].y,
    positions[0].z,
    positions[1].x,
    positions[1].y,
    positions[1].z,
  ];
  packedInstance.push(
    Ellipsoid.WGS84.radii.x,
    Ellipsoid.WGS84.radii.y,
    Ellipsoid.WGS84.radii.z
  );
  packedInstance.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  packedInstance.push(30000.0, 0.0, 0.0, 2.0, 0.1, 0.0, -1);
  createPackableSpecs(CorridorGeometry, corridor, packedInstance);
});
