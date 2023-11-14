import { Cartesian3 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { SphereGeometry } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/SphereGeometry", function () {
  it("constructor throws with invalid stackPartitions", function () {
    expect(function () {
      return new SphereGeometry({
        stackPartitions: -1,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid slicePartitions", function () {
    expect(function () {
      return new SphereGeometry({
        slicePartitions: -1,
      });
    }).toThrowDeveloperError();
  });

  it("computes positions", function () {
    const m = SphereGeometry.createGeometry(
      new SphereGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        radius: 1,
        stackPartitions: 3,
        slicePartitions: 3,
      })
    );

    // The vertices are 6x6 because an additional slice and stack are added
    // and the first and last clock and cone angles are duplicated (3 + 1 + 2 = 6)
    const numVertices = 36; // 6 rows * 6 positions
    const numTriangles = 18; // 6 top + 6 bottom + 6 around the sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3); // 4 positions * 4 rows
    expect(m.indices.length).toEqual(numTriangles * 3); //3 top + 3 bottom + 2 triangles * 3 sides
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("compute all vertex attributes", function () {
    const m = SphereGeometry.createGeometry(
      new SphereGeometry({
        vertexFormat: VertexFormat.ALL,
        radius: 1,
        stackPartitions: 3,
        slicePartitions: 3,
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
    const m = SphereGeometry.createGeometry(
      new SphereGeometry({
        vertexFormat: VertexFormat.ALL,
        radius: 1,
        stackPartitions: 3,
        slicePartitions: 3,
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
        Cartesian3.normalize(position, position),
        CesiumMath.EPSILON7
      );
      expect(Cartesian3.dot(Cartesian3.UNIT_Z, tangent)).not.toBeLessThan(0.0);
      expect(bitangent).toEqualEpsilon(
        Cartesian3.cross(normal, tangent, normal),
        CesiumMath.EPSILON7
      );
    }
  });

  it("undefined is returned if radius is equals to zero", function () {
    const sphere = new SphereGeometry({
      radius: 0.0,
      vertexFormat: VertexFormat.POSITION_ONLY,
    });

    const geometry = SphereGeometry.createGeometry(sphere);

    expect(geometry).toBeUndefined();
  });

  const sphere = new SphereGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    radius: 1,
    stackPartitions: 3,
    slicePartitions: 3,
  });
  // Adding TWO_PI and PI here for maximum clock/cone and other options from partial ellipsoids
  const packedInstance = [
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    CesiumMath.TWO_PI,
    0.0,
    CesiumMath.PI,
    3.0,
    3.0,
    -1.0,
  ];
  createPackableSpecs(SphereGeometry, sphere, packedInstance);
});
