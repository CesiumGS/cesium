import { arrayFill } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { EllipsoidGeometry } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/EllipsoidGeometry", function () {
  it("constructor rounds floating-point slicePartitions", function () {
    var m = new EllipsoidGeometry({
      slicePartitions: 3.5,
      stackPartitions: 3,
    });
    expect(m._slicePartitions).toEqual(4);
  });

  it("constructor rounds floating-point stackPartitions", function () {
    var m = new EllipsoidGeometry({
      slicePartitions: 3,
      stackPartitions: 3.5,
    });
    expect(m._stackPartitions).toEqual(4);
  });

  it("constructor throws with invalid slicePartitions", function () {
    expect(function () {
      return new EllipsoidGeometry({
        slicePartitions: -1,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid stackPartitions", function () {
    expect(function () {
      return new EllipsoidGeometry({
        stackPartitions: -1,
      });
    }).toThrowDeveloperError();
  });

  it("computes positions", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    // The vertices are 6x6 because an additional slice and stack are added
    // and the first and last clock and cone angles are duplicated (3 + 1 + 2 = 6)
    var numVertices = 36; // 6 rows * 6 positions
    var numTriangles = 18; // 6 top + 6 bottom + 6 around the sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes offset attribute", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    var numVertices = 36;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    var offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    var expected = new Array(offset.length);
    expected = arrayFill(expected, 1);
    expect(offset).toEqual(expected);
  });

  it("compute all vertex attributes", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    var numVertices = 36;
    var numTriangles = 18;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes attributes for a unit sphere", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    var positions = m.attributes.position.values;
    var normals = m.attributes.normal.values;
    var tangents = m.attributes.tangent.values;
    var bitangents = m.attributes.bitangent.values;

    for (var i = 0; i < positions.length; i += 3) {
      var position = Cartesian3.fromArray(positions, i);
      var normal = Cartesian3.fromArray(normals, i);
      var tangent = Cartesian3.fromArray(tangents, i);
      var bitangent = Cartesian3.fromArray(bitangents, i);

      expect(Cartesian3.magnitude(position)).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON10
      );
      expect(normal).toEqualEpsilon(
        Cartesian3.normalize(position, new Cartesian3()),
        CesiumMath.EPSILON7
      );
      expect(Cartesian3.dot(Cartesian3.UNIT_Z, tangent)).not.toBeLessThan(0.0);
      expect(bitangent).toEqualEpsilon(
        Cartesian3.cross(normal, tangent, new Cartesian3()),
        CesiumMath.EPSILON7
      );
    }
  });

  it("computes positions with inner surface", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
      })
    );

    var numVertices = 72; // 6 rows * 6 positions * 2 surfaces
    var numTriangles = 36; // (6 top + 6 bottom + 6 around the sides) * 2 surfaces
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes positions with inner surface and partial clock range", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 4,
        stackPartitions: 4,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
      })
    );

    var numVertices = 70;
    var numTriangles = 48;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes positions with inner surface and partial clock range and open top", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 4,
        stackPartitions: 4,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
        minimumCone: CesiumMath.toRadians(30.0),
      })
    );

    var numVertices = 60;
    var numTriangles = 40;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes partitions to default to 2 if less than 2", function () {
    var geometry = new EllipsoidGeometry({
      radii: new Cartesian3(0.5, 0.5, 0.5),
    });

    geometry._slicePartitions = 0;
    geometry._stackPartitions = 0;

    var m = EllipsoidGeometry.createGeometry(geometry);

    expect(m.indices.length).toEqual(6);
  });

  it("negates normals on an ellipsoid", function () {
    var negatedNormals = 0;

    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        radii: new Cartesian3(1.0, 1.0, 1.0),
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumCone: CesiumMath.toRadians(60.0),
        maximumCone: CesiumMath.toRadians(140.0),
      })
    );

    var positions = m.attributes.position.values;
    var normals = m.attributes.normal.values;

    for (var i = 0; i < positions.length; i += 3) {
      var normal = Cartesian3.fromArray(normals, i);

      if (normal.x < 0 && normal.y < 0 && normal.z < 0) {
        negatedNormals++;
      }
    }

    expect(negatedNormals).toEqual(496);
  });

  it("computes the unit ellipsoid", function () {
    var ellipsoid = EllipsoidGeometry.getUnitEllipsoid();
    expect(ellipsoid).toBeDefined();
    expect(ellipsoid.boundingSphere.radius).toEqual(1);

    expect(EllipsoidGeometry.getUnitEllipsoid()).toBe(ellipsoid);
  });

  it("computes positions with inner surface and partial clock range and open top and bottom", function () {
    var m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 4,
        stackPartitions: 4,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
        minimumCone: CesiumMath.toRadians(30.0),
        maximumCone: CesiumMath.toRadians(120.0),
      })
    );

    var numVertices = 50;
    var numTriangles = 32;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("undefined is returned if the x, y, or z radii or innerRadii are equal or less than zero", function () {
    var ellipsoid0 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(0.0, 500000.0, 500000.0),
    });
    var ellipsoid1 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 0.0, 500000.0),
    });
    var ellipsoid2 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 500000.0, 0.0),
    });
    var ellipsoid3 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(-10.0, 500000.0, 500000.0),
    });
    var ellipsoid4 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, -10.0, 500000.0),
    });
    var ellipsoid5 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 500000.0, -10.0),
    });
    var ellipsoid6 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(0.0, 100000.0, 100000.0),
    });
    var ellipsoid7 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 0.0, 100000.0),
    });
    var ellipsoid8 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, 0.0),
    });
    var ellipsoid9 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(-10.0, 100000.0, 100000.0),
    });
    var ellipsoid10 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, -10.0, 100000.0),
    });
    var ellipsoid11 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, -10.0),
    });

    var geometry0 = EllipsoidGeometry.createGeometry(ellipsoid0);
    var geometry1 = EllipsoidGeometry.createGeometry(ellipsoid1);
    var geometry2 = EllipsoidGeometry.createGeometry(ellipsoid2);
    var geometry3 = EllipsoidGeometry.createGeometry(ellipsoid3);
    var geometry4 = EllipsoidGeometry.createGeometry(ellipsoid4);
    var geometry5 = EllipsoidGeometry.createGeometry(ellipsoid5);
    var geometry6 = EllipsoidGeometry.createGeometry(ellipsoid6);
    var geometry7 = EllipsoidGeometry.createGeometry(ellipsoid7);
    var geometry8 = EllipsoidGeometry.createGeometry(ellipsoid8);
    var geometry9 = EllipsoidGeometry.createGeometry(ellipsoid9);
    var geometry10 = EllipsoidGeometry.createGeometry(ellipsoid10);
    var geometry11 = EllipsoidGeometry.createGeometry(ellipsoid11);

    expect(geometry0).toBeUndefined();
    expect(geometry1).toBeUndefined();
    expect(geometry2).toBeUndefined();
    expect(geometry3).toBeUndefined();
    expect(geometry4).toBeUndefined();
    expect(geometry5).toBeUndefined();
    expect(geometry6).toBeUndefined();
    expect(geometry7).toBeUndefined();
    expect(geometry8).toBeUndefined();
    expect(geometry9).toBeUndefined();
    expect(geometry10).toBeUndefined();
    expect(geometry11).toBeUndefined();
  });

  var ellipsoidgeometry = new EllipsoidGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    radii: new Cartesian3(1.0, 2.0, 3.0),
    innerRadii: new Cartesian3(0.5, 0.6, 0.7),
    minimumClock: 0.1,
    maximumClock: 0.2,
    minimumCone: 0.3,
    maximumCone: 0.4,
    slicePartitions: 3,
    stackPartitions: 3,
  });
  var packedInstance = [
    1.0,
    2.0,
    3.0,
    0.5,
    0.6,
    0.7,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.1,
    0.2,
    0.3,
    0.4,
    3.0,
    3.0,
    -1,
  ];
  createPackableSpecs(EllipsoidGeometry, ellipsoidgeometry, packedInstance);
});
