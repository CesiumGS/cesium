import {
  Cartesian3,
  PlaneGeometry,
  VertexFormat,
} from "../../index.js";;

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

describe("Core/PlaneGeometry", function () {
  it("constructor creates optimized number of positions for VertexFormat.POSITIONS_ONLY", function () {
    const m = PlaneGeometry.createGeometry(
      new PlaneGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
      })
    );

    expect(m.attributes.position.values.length).toEqual(4 * 3); // 4 corners
    expect(m.indices.length).toEqual(2 * 3); // 2 triangles
  });

  it("constructor computes all vertex attributes", function () {
    const m = PlaneGeometry.createGeometry(
      new PlaneGeometry({
        vertexFormat: VertexFormat.ALL,
      })
    );

    const numVertices = 4;
    const numTriangles = 2;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);

    expect(m.indices.length).toEqual(numTriangles * 3);

    expect(m.boundingSphere.center).toEqual(Cartesian3.ZERO);
    expect(m.boundingSphere.radius).toEqual(Math.sqrt(2.0));
  });

  createPackableSpecs(
    PlaneGeometry,
    new PlaneGeometry({
      vertexFormat: VertexFormat.POSITION_AND_NORMAL,
    }),
    [1.0, 1.0, 0.0, 0.0, 0.0, 0.0]
  );
});
