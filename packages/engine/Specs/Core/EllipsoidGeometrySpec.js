import {
  Cartesian3,
  EllipsoidGeometry,
  GeometryOffsetAttribute,
  VertexFormat,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/EllipsoidGeometry", function () {
  it("constructor rounds floating-point slicePartitions", function () {
    const m = new EllipsoidGeometry({
      slicePartitions: 3.5,
      stackPartitions: 3,
    });
    expect(m._slicePartitions).toEqual(4);
  });

  it("constructor rounds floating-point stackPartitions", function () {
    const m = new EllipsoidGeometry({
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
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    // The vertices are 6x6 because an additional slice and stack are added
    // and the first and last clock and cone angles are duplicated (3 + 1 + 2 = 6)
    const numVertices = 36; // 6 rows * 6 positions
    const numTriangles = 18; // 6 top + 6 bottom + 6 around the sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes offset attribute", function () {
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 36;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("compute all vertex attributes", function () {
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    const numVertices = 36;
    const numTriangles = 18;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes attributes for a unit sphere", function () {
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        slicePartitions: 3,
        stackPartitions: 3,
      })
    );

    const positions = m.attributes.position.values;
    const normals = m.attributes.normal.values;
    const tangents = m.attributes.tangent.values;
    const bitangents = m.attributes.bitangent.values;

    for (let i = 0; i < positions.length; i += 3) {
      const position = Cartesian3.fromArray(positions, i);
      const normal = Cartesian3.fromArray(normals, i);
      const tangent = Cartesian3.fromArray(tangents, i);
      const bitangent = Cartesian3.fromArray(bitangents, i);

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
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 3,
        stackPartitions: 3,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
      })
    );

    const numVertices = 72; // 6 rows * 6 positions * 2 surfaces
    const numTriangles = 36; // (6 top + 6 bottom + 6 around the sides) * 2 surfaces
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes positions with inner surface and partial clock range", function () {
    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        slicePartitions: 4,
        stackPartitions: 4,
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
      })
    );

    const numVertices = 70;
    const numTriangles = 48;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes positions with inner surface and partial clock range and open top", function () {
    const m = EllipsoidGeometry.createGeometry(
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

    const numVertices = 60;
    const numTriangles = 40;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes partitions to default to 2 if less than 2", function () {
    const geometry = new EllipsoidGeometry({
      radii: new Cartesian3(0.5, 0.5, 0.5),
    });

    geometry._slicePartitions = 0;
    geometry._stackPartitions = 0;

    const m = EllipsoidGeometry.createGeometry(geometry);

    expect(m.indices.length).toEqual(6);
  });

  it("negates normals on an ellipsoid", function () {
    let negatedNormals = 0;

    const m = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        vertexFormat: VertexFormat.ALL,
        radii: new Cartesian3(1.0, 1.0, 1.0),
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumCone: CesiumMath.toRadians(60.0),
        maximumCone: CesiumMath.toRadians(140.0),
      })
    );

    const positions = m.attributes.position.values;
    const normals = m.attributes.normal.values;

    for (let i = 0; i < positions.length; i += 3) {
      const normal = Cartesian3.fromArray(normals, i);

      if (normal.x < 0 && normal.y < 0 && normal.z < 0) {
        negatedNormals++;
      }
    }

    expect(negatedNormals).toEqual(496);
  });

  it("computes the unit ellipsoid", function () {
    const ellipsoid = EllipsoidGeometry.getUnitEllipsoid();
    expect(ellipsoid).toBeDefined();
    expect(ellipsoid.boundingSphere.radius).toEqual(1);

    expect(EllipsoidGeometry.getUnitEllipsoid()).toBe(ellipsoid);
  });

  it("computes positions with inner surface and partial clock range and open top and bottom", function () {
    const m = EllipsoidGeometry.createGeometry(
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

    const numVertices = 50;
    const numTriangles = 32;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("undefined is returned if the x, y, or z radii or innerRadii are equal or less than zero", function () {
    const ellipsoid0 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(0.0, 500000.0, 500000.0),
    });
    const ellipsoid1 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 0.0, 500000.0),
    });
    const ellipsoid2 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 500000.0, 0.0),
    });
    const ellipsoid3 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(-10.0, 500000.0, 500000.0),
    });
    const ellipsoid4 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, -10.0, 500000.0),
    });
    const ellipsoid5 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(1000000.0, 500000.0, -10.0),
    });
    const ellipsoid6 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(0.0, 100000.0, 100000.0),
    });
    const ellipsoid7 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 0.0, 100000.0),
    });
    const ellipsoid8 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, 0.0),
    });
    const ellipsoid9 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(-10.0, 100000.0, 100000.0),
    });
    const ellipsoid10 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, -10.0, 100000.0),
    });
    const ellipsoid11 = new EllipsoidGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, -10.0),
    });

    const geometry0 = EllipsoidGeometry.createGeometry(ellipsoid0);
    const geometry1 = EllipsoidGeometry.createGeometry(ellipsoid1);
    const geometry2 = EllipsoidGeometry.createGeometry(ellipsoid2);
    const geometry3 = EllipsoidGeometry.createGeometry(ellipsoid3);
    const geometry4 = EllipsoidGeometry.createGeometry(ellipsoid4);
    const geometry5 = EllipsoidGeometry.createGeometry(ellipsoid5);
    const geometry6 = EllipsoidGeometry.createGeometry(ellipsoid6);
    const geometry7 = EllipsoidGeometry.createGeometry(ellipsoid7);
    const geometry8 = EllipsoidGeometry.createGeometry(ellipsoid8);
    const geometry9 = EllipsoidGeometry.createGeometry(ellipsoid9);
    const geometry10 = EllipsoidGeometry.createGeometry(ellipsoid10);
    const geometry11 = EllipsoidGeometry.createGeometry(ellipsoid11);

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

  const ellipsoidgeometry = new EllipsoidGeometry({
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
  const packedInstance = [
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
