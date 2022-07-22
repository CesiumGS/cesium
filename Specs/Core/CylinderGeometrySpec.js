import {
  CylinderGeometry,
  GeometryOffsetAttribute,
  VertexFormat,
} from "../../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/CylinderGeometry", function () {
  it("constructor throws with no length", function () {
    expect(function () {
      return new CylinderGeometry({});
    }).toThrowDeveloperError();
  });

  it("constructor throws with no topRadius", function () {
    expect(function () {
      return new CylinderGeometry({
        length: 1,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with no bottomRadius", function () {
    expect(function () {
      return new CylinderGeometry({
        length: 1,
        topRadius: 1,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if slices is less than 3", function () {
    expect(function () {
      return new CylinderGeometry({
        length: 1,
        topRadius: 1,
        bottomRadius: 1,
        slices: 2,
      });
    }).toThrowDeveloperError();
  });

  it("computes positions", function () {
    const m = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        length: 1,
        topRadius: 1,
        bottomRadius: 1,
        slices: 3,
      })
    );

    const numVertices = 12; // (3 top + 3 bottom) * 2 to duplicate for sides
    const numTriangles = 8; // 1 top  + 1 bottom + 2 triangles * 3 sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes offset attribute", function () {
    const m = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        length: 1,
        topRadius: 1,
        bottomRadius: 1,
        slices: 3,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 12;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("compute all vertex attributes", function () {
    const m = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        vertexFormat: VertexFormat.ALL,
        length: 1,
        topRadius: 1,
        bottomRadius: 1,
        slices: 3,
      })
    );

    const numVertices = 12;
    const numTriangles = 8;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions with topRadius equals 0", function () {
    const m = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        length: 1,
        topRadius: 0,
        bottomRadius: 1,
        slices: 3,
      })
    );

    const numVertices = 12; //(3 top 3 bottom) duplicated
    const numTriangles = 8; //1 top 1 bottom, 2 on each of 3 sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions with bottomRadius equals 0", function () {
    const m = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        length: 1,
        topRadius: 1,
        bottomRadius: 0,
        slices: 3,
      })
    );

    const numVertices = 12; //(3 top 3 bottom) duplicated
    const numTriangles = 8; //1 top 1 bottom, 2 on each of 3 sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it(
    "undefined is returned if the length is less than or equal to zero or if " +
      "both radii are equal to zero or is either radii and less than zero",
    function () {
      const cylinder0 = new CylinderGeometry({
        length: 0,
        topRadius: 80000,
        bottomRadius: 200000,
      });
      const cylinder1 = new CylinderGeometry({
        length: 200000,
        topRadius: 0,
        bottomRadius: 0,
      });
      const cylinder2 = new CylinderGeometry({
        length: 200000,
        topRadius: -10,
        bottomRadius: 4,
      });
      const cylinder3 = new CylinderGeometry({
        length: -200000,
        topRadius: 100,
        bottomRadius: 100,
      });
      const cylinder4 = new CylinderGeometry({
        length: 200000,
        topRadius: 0,
        bottomRadius: -34,
      });

      const geometry0 = CylinderGeometry.createGeometry(cylinder0);
      const geometry1 = CylinderGeometry.createGeometry(cylinder1);
      const geometry2 = CylinderGeometry.createGeometry(cylinder2);
      const geometry3 = CylinderGeometry.createGeometry(cylinder3);
      const geometry4 = CylinderGeometry.createGeometry(cylinder4);

      expect(geometry0).toBeUndefined();
      expect(geometry1).toBeUndefined();
      expect(geometry2).toBeUndefined();
      expect(geometry3).toBeUndefined();
      expect(geometry4).toBeUndefined();
    }
  );

  const cylinder = new CylinderGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    length: 1,
    topRadius: 1,
    bottomRadius: 0,
    slices: 3,
  });
  const packedInstance = [
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
    0.0,
    3.0,
    -1.0,
  ];
  createPackableSpecs(CylinderGeometry, cylinder, packedInstance);
});
