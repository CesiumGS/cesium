import {
  AxisAlignedBoundingBox,
  BoxGeometry,
  Cartesian3,
  GeometryOffsetAttribute,
  VertexFormat,
} from "../../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/BoxGeometry", function () {
  it("constructor throws without maximum corner", function () {
    expect(function () {
      return new BoxGeometry({
        maximum: new Cartesian3(),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without minimum corner", function () {
    expect(function () {
      return new BoxGeometry({
        minimum: new Cartesian3(),
      });
    }).toThrowDeveloperError();
  });

  it("constructor creates optimized number of positions for VertexFormat.POSITIONS_ONLY", function () {
    const m = BoxGeometry.createGeometry(
      new BoxGeometry({
        minimum: new Cartesian3(-1, -2, -3),
        maximum: new Cartesian3(1, 2, 3),
        vertexFormat: VertexFormat.POSITION_ONLY,
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3); // 8 corners
    expect(m.indices.length).toEqual(12 * 3); // 6 sides x 2 triangles per side
  });

  it("constructor computes all vertex attributes", function () {
    const minimumCorner = new Cartesian3(0, 0, 0);
    const maximumCorner = new Cartesian3(1, 1, 1);
    const m = BoxGeometry.createGeometry(
      new BoxGeometry({
        minimum: minimumCorner,
        maximum: maximumCorner,
        vertexFormat: VertexFormat.ALL,
      })
    );

    const numVertices = 24; //3 points x 8 corners
    const numTriangles = 12; //6 sides x 2 triangles per side
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);

    expect(m.indices.length).toEqual(numTriangles * 3);

    expect(m.boundingSphere.center).toEqual(Cartesian3.ZERO);
    expect(m.boundingSphere.radius).toEqual(
      Cartesian3.magnitude(maximumCorner) * 0.5
    );
  });

  it("computes offset attribute", function () {
    const m = BoxGeometry.createGeometry(
      new BoxGeometry({
        minimum: new Cartesian3(-1, -2, -3),
        maximum: new Cartesian3(1, 2, 3),
        vertexFormat: VertexFormat.POSITION_ONLY,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 8;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("fromDimensions throws without dimensions", function () {
    expect(function () {
      return BoxGeometry.fromDimensions();
    }).toThrowDeveloperError();
  });

  it("fromDimensions throws with negative dimensions", function () {
    expect(function () {
      return BoxGeometry.fromDimensions({
        dimensions: new Cartesian3(1, 2, -1),
      });
    }).toThrowDeveloperError();
  });

  it("fromDimensions", function () {
    const m = BoxGeometry.createGeometry(
      BoxGeometry.fromDimensions({
        dimensions: new Cartesian3(1, 2, 3),
        vertexFormat: VertexFormat.POSITION_ONLY,
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(12 * 3);
  });

  it("fromAxisAlignedBoundingBox throws with no boundingBox", function () {
    expect(function () {
      return BoxGeometry.fromAxisAlignedBoundingBox(undefined);
    }).toThrowDeveloperError();
  });

  it("fromAxisAlignedBoundingBox", function () {
    const min = new Cartesian3(-1, -2, -3);
    const max = new Cartesian3(1, 2, 3);
    const m = BoxGeometry.fromAxisAlignedBoundingBox(
      new AxisAlignedBoundingBox(min, max)
    );
    expect(m._minimum).toEqual(min);
    expect(m._maximum).toEqual(max);
  });

  it("undefined is returned if min and max are equal", function () {
    const box = new BoxGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      maximum: new Cartesian3(250000.0, 250000.0, 250000.0),
      minimum: new Cartesian3(250000.0, 250000.0, 250000.0),
    });

    const geometry = BoxGeometry.createGeometry(box);

    expect(geometry).toBeUndefined();
  });

  createPackableSpecs(
    BoxGeometry,
    new BoxGeometry({
      minimum: new Cartesian3(1.0, 2.0, 3.0),
      maximum: new Cartesian3(4.0, 5.0, 6.0),
      vertexFormat: VertexFormat.POSITION_AND_NORMAL,
    }),
    [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, -1.0]
  );
});
