import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  GeographicProjection,
  GeometryOffsetAttribute,
  Matrix2,
  Rectangle,
  RectangleGeometry,
  VertexFormat,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/RectangleGeometry", function () {
  it("computes positions", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;
    const length = positions.length;

    expect(positions.length).toEqual(9 * 3);
    expect(m.indices.length).toEqual(8 * 3);

    const expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.northwest(rectangle)
    );
    const expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.southeast(rectangle)
    );
    expect(
      new Cartesian3(positions[0], positions[1], positions[2])
    ).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
    expect(
      new Cartesian3(
        positions[length - 3],
        positions[length - 2],
        positions[length - 1]
      )
    ).toEqualEpsilon(expectedSECorner, CesiumMath.EPSILON9);
  });

  it("computes positions across IDL", function () {
    const rectangle = Rectangle.fromDegrees(179.0, -1.0, -179.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;
    const length = positions.length;

    expect(positions.length).toEqual(9 * 3);
    expect(m.indices.length).toEqual(8 * 3);

    const expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.northwest(rectangle)
    );
    const expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.southeast(rectangle)
    );
    expect(
      new Cartesian3(positions[0], positions[1], positions[2])
    ).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON8);
    expect(
      new Cartesian3(
        positions[length - 3],
        positions[length - 2],
        positions[length - 1]
      )
    ).toEqualEpsilon(expectedSECorner, CesiumMath.EPSILON8);
  });

  it("computes positions at north pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, 89.0, -179.0, 90.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;
    expect(positions.length).toEqual(5 * 3);
    expect(m.indices.length).toEqual(3 * 3);
  });

  it("computes positions at south pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, -90.0, -179.0, -89.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;
    expect(positions.length).toEqual(5 * 3);
    expect(m.indices.length).toEqual(3 * 3);
  });

  it("computes all attributes", function () {
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.ALL,
        rectangle: new Rectangle(-2.0, -1.0, 0.0, 1.0),
        granularity: 1.0,
      })
    );
    const numVertices = 9; // 8 around edge + 1 in middle
    const numTriangles = 8; // 4 squares * 2 triangles per square
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("compute positions with rotation", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.PI_OVER_TWO;
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITIONS_ONLY,
        rectangle: rectangle,
        rotation: angle,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;
    const length = positions.length;

    expect(length).toEqual(9 * 3);
    expect(m.indices.length).toEqual(8 * 3);

    const unrotatedSECorner = Rectangle.southeast(rectangle);
    const projection = new GeographicProjection();
    const projectedSECorner = projection.project(unrotatedSECorner);
    const rotation = Matrix2.fromRotation(angle);
    const rotatedSECornerCartographic = projection.unproject(
      Matrix2.multiplyByVector(rotation, projectedSECorner, new Cartesian2())
    );
    const rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(
      rotatedSECornerCartographic
    );
    const actual = new Cartesian3(
      positions[length - 3],
      positions[length - 2],
      positions[length - 1]
    );
    expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
  });

  it("compute vertices with PI rotation", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        rectangle: rectangle,
        rotation: CesiumMath.PI,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;
    const length = positions.length;

    expect(length).toEqual(9 * 3);
    expect(m.indices.length).toEqual(8 * 3);

    const unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.northwest(rectangle)
    );
    const unrotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.southeast(rectangle)
    );

    let actual = new Cartesian3(positions[0], positions[1], positions[2]);
    expect(actual).toEqualEpsilon(unrotatedSECorner, CesiumMath.EPSILON8);

    actual = new Cartesian3(
      positions[length - 3],
      positions[length - 2],
      positions[length - 1]
    );
    expect(actual).toEqualEpsilon(unrotatedNWCorner, CesiumMath.EPSILON8);
  });

  it("compute texture coordinates with rotation", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.PI_OVER_TWO;
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        rectangle: rectangle,
        stRotation: angle,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;
    const st = m.attributes.st.values;
    const length = st.length;

    expect(positions.length).toEqual(9 * 3);
    expect(length).toEqual(9 * 2);
    expect(m.indices.length).toEqual(8 * 3);

    expect(st[length - 2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
    expect(st[length - 1]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
  });

  it("compute texture coordinate rotation with rectangle rotation", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.toRadians(30);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        rectangle: rectangle,
        rotation: angle,
        stRotation: angle,
        granularity: 1.0,
      })
    );
    const st = m.attributes.st.values;

    expect(st[0]).toEqual(0.0); //top left corner
    expect(st[1]).toEqual(1.0);
    expect(st[4]).toEqual(1.0); //top right corner
    expect(st[5]).toEqual(1.0);
    expect(st[12]).toEqual(0.0); //bottom left corner
    expect(st[13]).toEqual(0.0);
    expect(st[16]).toEqual(1.0); //bottom right corner
    expect(st[17]).toEqual(0.0);
  });

  it("throws without rectangle", function () {
    expect(function () {
      return new RectangleGeometry({});
    }).toThrowDeveloperError();
  });

  it("throws if rotated rectangle is invalid", function () {
    expect(function () {
      return RectangleGeometry.createGeometry(
        new RectangleGeometry({
          rectangle: new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            1,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO
          ),
          rotation: CesiumMath.PI_OVER_TWO,
        })
      );
    }).toThrowDeveloperError();
  });

  it("throws if north is less than south", function () {
    expect(function () {
      return new RectangleGeometry({
        rectangle: new Rectangle(
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          -CesiumMath.PI_OVER_TWO
        ),
      });
    }).toThrowDeveloperError();
  });

  it("computes positions extruded", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(42 * 3); // (9 fill + 8 edge + 4 corners) * 2 to duplicate for bottom
    expect(m.indices.length).toEqual(32 * 3); // 8 * 2 for fill top and bottom + 4 triangles * 4 walls
  });

  it("computes positions extruded at the north pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, 89.0, -179.0, 90.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(26 * 3); // (5 fill + 5 edge + 3 corners) * 2 to duplicate for bottom
    expect(m.indices.length).toEqual(16 * 3); // 3 * 2 for fill top and bottom + 2 triangles * 5 walls
  });

  it("computes positions extruded at the south pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, -90.0, -179.0, -89.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(26 * 3); // (5 fill + 5 edge + 3 corners) * 2 to duplicate for bottom
    expect(m.indices.length).toEqual(16 * 3); // 3 * 2 for fill top and bottom + 2 triangles * 5 walls
  });

  it("computes all attributes extruded", function () {
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.ALL,
        rectangle: new Rectangle(-2.0, -1.0, 0.0, 1.0),
        granularity: 1.0,
        extrudedHeight: 2,
      })
    );
    const numVertices = 42;
    const numTriangles = 32;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("compute positions with rotation extruded", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.PI_OVER_TWO;
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITIONS_ONLY,
        rectangle: rectangle,
        rotation: angle,
        granularity: 1.0,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;
    const length = positions.length;

    expect(length).toEqual(42 * 3);
    expect(m.indices.length).toEqual(32 * 3);

    const unrotatedSECorner = Rectangle.southeast(rectangle);
    const projection = new GeographicProjection();
    const projectedSECorner = projection.project(unrotatedSECorner);
    const rotation = Matrix2.fromRotation(angle);
    const rotatedSECornerCartographic = projection.unproject(
      Matrix2.multiplyByVector(rotation, projectedSECorner, new Cartesian2())
    );
    const rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(
      rotatedSECornerCartographic
    );
    const actual = new Cartesian3(positions[51], positions[52], positions[53]);
    expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
  });

  it("computes non-extruded rectangle if height is small", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: CesiumMath.EPSILON14,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 9;
    const numTriangles = 8;
    expect(positions.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes offset attribute", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 9;
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 42; // (9 fill + 8 edge + 4 corners) * 2 to duplicate for bottom
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 0, 9);
    for (let i = 18; i < offset.length; i += 2) {
      expected[i] = 1;
    }
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleGeometry.createGeometry(
      new RectangleGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 42; // (9 fill + 8 edge + 4 corners) * 2 to duplicate for bottom
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    for (let i = 18; i < offset.length; i += 2) {
      expected[i] = 1;
    }
    expect(offset).toEqual(expected);
  });

  it("undefined is returned if any side are of length zero", function () {
    const rectangle0 = new RectangleGeometry({
      rectangle: Rectangle.fromDegrees(-80.0, 39.0, -80.0, 42.0),
    });
    const rectangle1 = new RectangleGeometry({
      rectangle: Rectangle.fromDegrees(-81.0, 42.0, -80.0, 42.0),
    });
    const rectangle2 = new RectangleGeometry({
      rectangle: Rectangle.fromDegrees(-80.0, 39.0, -80.0, 39.0),
    });

    const geometry0 = RectangleGeometry.createGeometry(rectangle0);
    const geometry1 = RectangleGeometry.createGeometry(rectangle1);
    const geometry2 = RectangleGeometry.createGeometry(rectangle2);

    expect(geometry0).toBeUndefined();
    expect(geometry1).toBeUndefined();
    expect(geometry2).toBeUndefined();
  });

  it("computing rectangle property", function () {
    const rectangle = new Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    const geometry = new RectangleGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: rectangle,
      granularity: 1.0,
    });

    const r = geometry.rectangle;
    expect(CesiumMath.toDegrees(r.north)).toEqual(1.0);
    expect(CesiumMath.toDegrees(r.south)).toEqual(-1.0);
    expect(CesiumMath.toDegrees(r.east)).toEqual(1.0);
    expect(CesiumMath.toDegrees(r.west)).toEqual(-1.0);
  });

  it("computing rectangle property with rotation", function () {
    const rectangle = new Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    const geometry = new RectangleGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: rectangle,
      granularity: 1.0,
      rotation: CesiumMath.toRadians(45.0),
    });

    const r = geometry.rectangle;
    expect(CesiumMath.toDegrees(r.north)).toEqualEpsilon(
      1.414213562373095,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.toDegrees(r.south)).toEqualEpsilon(
      -1.414213562373095,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.toDegrees(r.east)).toEqualEpsilon(
      1.414213562373095,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.toDegrees(r.west)).toEqualEpsilon(
      -1.4142135623730951,
      CesiumMath.EPSILON15
    );
  });

  it("computing textureCoordinateRotationPoints property", function () {
    const rectangle = new Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    let geometry = new RectangleGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: rectangle,
      granularity: 1.0,
      rotation: CesiumMath.toRadians(90.0),
    });

    // 90 degree rotation means (0, 1) should be the new min and (1, 1) (0, 0) are extents
    let textureCoordinateRotationPoints =
      geometry.textureCoordinateRotationPoints;
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

    geometry = new RectangleGeometry({
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: rectangle,
      granularity: 1.0,
      rotation: CesiumMath.toRadians(90.0),
    });

    textureCoordinateRotationPoints = geometry.textureCoordinateRotationPoints;
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

  it("computeRectangle", function () {
    const options = {
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: new Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0),
      granularity: 1.0,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
      rotation: CesiumMath.PI,
    };
    const geometry = new RectangleGeometry(options);

    const expected = geometry.rectangle;
    const result = RectangleGeometry.computeRectangle(options);

    expect(result).toEqual(expected);
  });

  it("computeRectangle with result parameter", function () {
    const options = {
      vertexFormat: VertexFormat.POSITION_ONLY,
      rectangle: new Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0),
    };
    const geometry = new RectangleGeometry(options);

    const result = new Rectangle();
    const expected = geometry.rectangle;
    const returned = RectangleGeometry.computeRectangle(options, result);

    expect(returned).toEqual(expected);
    expect(returned).toBe(result);
  });

  it("computing rectangle property with zero rotation", function () {
    expect(function () {
      return RectangleGeometry.createGeometry(
        new RectangleGeometry({
          vertexFormat: VertexFormat.POSITION_ONLY,
          rectangle: Rectangle.MAX_VALUE,
          granularity: 1.0,
          rotation: 0,
        })
      );
    }).not.toThrowDeveloperError();
  });

  it("can create rectangle geometry where the nw corner and the center are on opposite sides of the IDL", function () {
    const rectangle = new Rectangle(
      Math.PI - 0.005,
      CesiumMath.PI_OVER_SIX + 0.02,
      0.01 - Math.PI,
      CesiumMath.PI_OVER_SIX + 0.04
    );

    const geometry = new RectangleGeometry({
      rectangle: rectangle,
      rotation: 0.5,
    });

    expect(function () {
      RectangleGeometry.createGeometry(geometry);
    }).not.toThrowDeveloperError();
  });

  const rectangle = new RectangleGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    rectangle: new Rectangle(-2.0, -1.0, 0.0, 1.0),
    granularity: 1.0,
    ellipsoid: Ellipsoid.UNIT_SPHERE,
  });
  const packedInstance = [
    -2.0,
    -1.0,
    0.0,
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
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    -1,
  ];
  createPackableSpecs(RectangleGeometry, rectangle, packedInstance);
});
