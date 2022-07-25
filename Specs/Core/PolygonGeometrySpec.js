import {
  ArcType,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Ellipsoid,
  GeometryOffsetAttribute,
  GeometryPipeline,
  PolygonGeometry,
  Rectangle,
  VertexFormat,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/PolygonGeometry", function () {
  it("throws without hierarchy", function () {
    expect(function () {
      return new PolygonGeometry();
    }).toThrowDeveloperError();
  });

  it("throws with height when perPositionHeight is true", function () {
    expect(function () {
      return new PolygonGeometry({
        height: 30,
        perPositionHeight: true,
      });
    }).toThrowDeveloperError();
  });

  it("throws without positions", function () {
    expect(function () {
      return PolygonGeometry.fromPositions();
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than three positions", function () {
    expect(
      PolygonGeometry.createGeometry(
        PolygonGeometry.fromPositions({
          positions: [new Cartesian3()],
        })
      )
    ).toBeUndefined();
  });

  it("returns undefined with polygon hierarchy with less than three positions", function () {
    expect(
      PolygonGeometry.createGeometry(
        new PolygonGeometry({
          polygonHierarchy: {
            positions: [Cartesian3.fromDegrees(0, 0)],
          },
        })
      )
    ).toBeUndefined();
  });

  it("throws if arcType is not valid", function () {
    expect(function () {
      return new PolygonGeometry({
        positions: [
          Cartesian3.fromDegrees(0, 0),
          Cartesian3.fromDegrees(1, 0),
          Cartesian3.fromDegrees(1, 1),
        ],
        arcType: ArcType.NONE,
      });
    }).toThrowDeveloperError();
  });

  it("createGeometry returns undefined due to duplicate positions", function () {
    const geometry = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArray([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns undefined due to duplicate positions extruded", function () {
    const geometry = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArray([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
        extrudedHeight: 2,
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

    const geometry = PolygonGeometry.createGeometry(
      new PolygonGeometry({ polygonHierarchy: hierarchy })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns undefined due to duplicate hierarchy positions with different heights", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArrayHeights([
        1.0,
        1.0,
        10.0,
        1.0,
        1.0,
        20.0,
        1.0,
        1.0,
        30.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArrayHeights([
            0.0,
            0.0,
            10.0,
            0.0,
            0.0,
            20.0,
            0.0,
            0.0,
            30.0,
          ]),
        },
      ],
    };

    const geometry = PolygonGeometry.createGeometry(
      new PolygonGeometry({ polygonHierarchy: hierarchy })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns geometry if duplicate hierarchy positions with different heights and perPositionHeight is true", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArrayHeights([
        1.0,
        1.0,
        10.0,
        1.0,
        1.0,
        20.0,
        1.0,
        1.0,
        30.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArrayHeights([
            0.0,
            0.0,
            10.0,
            0.0,
            0.0,
            20.0,
            0.0,
            0.0,
            30.0,
          ]),
        },
      ],
    };

    const geometry = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        polygonHierarchy: hierarchy,
        perPositionHeight: true,
      })
    );
    expect(geometry).toBeDefined();
  });

  it("computes positions", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        granularity: CesiumMath.RADIANS_PER_DEGREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(13 * 3); // 8 around edge + 5 in the middle
    expect(p.indices.length).toEqual(16 * 3); //4 squares * 4 triangles per square
  });

  it("computes positions with per position heights", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const height = 100.0;
    const positions = Cartesian3.fromDegreesArrayHeights([
      -1.0,
      -1.0,
      height,
      1.0,
      -1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      -1.0,
      1.0,
      0.0,
    ]);
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: positions,
        perPositionHeight: true,
      })
    );

    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 0)
      ).height
    ).toEqualEpsilon(height, CesiumMath.EPSILON6);
    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 3)
      ).height
    ).toEqualEpsilon(0, CesiumMath.EPSILON6);
  });

  it("create geometry creates with rhumb lines", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        granularity: CesiumMath.RADIANS_PER_DEGREE,
        arcType: ArcType.RHUMB,
      })
    );

    expect(p.attributes.position.values.length).toEqual(15 * 3); // 8 around edge + 7 in the middle
    expect(p.indices.length).toEqual(20 * 3); //5 squares * 4 triangles per square
  });

  it("create geometry throws if arcType is STRAIGHT", function () {
    expect(function () {
      PolygonGeometry.createGeometry(
        PolygonGeometry.fromPositions({
          vertexFormat: VertexFormat.POSITION_ONLY,
          positions: Cartesian3.fromDegreesArray([
            -1.0,
            -1.0,
            1.0,
            -1.0,
            1.0,
            1.0,
            -1.0,
            1.0,
          ]),
          granularity: CesiumMath.RADIANS_PER_DEGREE,
          arcType: ArcType.NONE,
        })
      );
    }).toThrowDeveloperError();
  });

  it("create geometry creates with lines with different number of subdivisions for geodesic and rhumb", function () {
    const positions = Cartesian3.fromDegreesArray([
      -30.0,
      -30.0,
      30.0,
      -30.0,
      30.0,
      30.0,
      -30.0,
      30.0,
    ]);
    const geodesic = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: positions,
        granularity: CesiumMath.RADIANS_PER_DEGREE,
        arcType: ArcType.GEODESIC,
      })
    );
    const rhumb = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: positions,
        granularity: CesiumMath.RADIANS_PER_DEGREE,
        arcType: ArcType.RHUMB,
      })
    );

    expect(geodesic.attributes.position.values.length).not.toEqual(
      rhumb.attributes.position.values.length
    );
    expect(geodesic.indices.length).not.toEqual(rhumb.indices.length);
  });

  it("computes positions with per position heights for rhumb lines", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const height = 100.0;
    const positions = Cartesian3.fromDegreesArrayHeights([
      -1.0,
      -1.0,
      height,
      1.0,
      -1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      -1.0,
      1.0,
      0.0,
    ]);
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: positions,
        perPositionHeight: true,
        arcType: ArcType.RHUMB,
      })
    );

    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 0)
      ).height
    ).toEqualEpsilon(height, CesiumMath.EPSILON6);
    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 3)
      ).height
    ).toEqualEpsilon(0, CesiumMath.EPSILON6);
  });

  it("computes all attributes", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
      })
    );

    const numVertices = 13;
    const numTriangles = 16;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.attributes.st.values.length).toEqual(numVertices * 2);
    expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("creates a polygon from hierarchy", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -110.0,
        35.0,
        -110.0,
        40.0,
        -124.0,
        40.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            -122.0,
            36.0,
            -122.0,
            39.0,
            -112.0,
            39.0,
            -112.0,
            36.0,
          ]),
          holes: [
            {
              positions: Cartesian3.fromDegreesArray([
                -120.0,
                36.5,
                -114.0,
                36.5,
                -114.0,
                38.5,
                -120.0,
                38.5,
              ]),
            },
          ],
        },
      ],
    };

    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3); // 4 points * 3 rectangles
    expect(p.indices.length).toEqual(10 * 3);
  });

  it("creates a polygon from hierarchy with rhumb lines", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -110.0,
        35.0,
        -110.0,
        40.0,
        -124.0,
        40.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            -122.0,
            36.0,
            -122.0,
            39.0,
            -112.0,
            39.0,
            -112.0,
            36.0,
          ]),
          holes: [
            {
              positions: Cartesian3.fromDegreesArray([
                -120.0,
                36.5,
                -114.0,
                36.5,
                -114.0,
                38.5,
                -120.0,
                38.5,
              ]),
            },
          ],
        },
      ],
    };

    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
        arcType: ArcType.RHUMB,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3); // 4 points * 3 rectangles
    expect(p.indices.length).toEqual(10 * 3);
  });

  it("removes duplicates in polygon hierarchy", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -110.0,
        35.0,
        -110.0,
        35.0,
        -110.0,
        40.0,
        -124.0,
        40.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            -122.0,
            36.0,
            -122.0,
            39.0,
            -122.0,
            39.0,
            -112.0,
            39.0,
            -112.0,
            36.0,
          ]),
          holes: [
            {
              positions: Cartesian3.fromDegreesArray([
                -120.0,
                36.5,
                -114.0,
                36.5,
                -114.0,
                36.5,
                -114.0,
                38.5,
                -120.0,
                38.5,
              ]),
            },
          ],
        },
      ],
    };

    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3);
    expect(p.indices.length).toEqual(10 * 3);
  });

  it("creates a polygon from clockwise hierarchy", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -124.0,
        40.0,
        -110.0,
        40.0,
        -110.0,
        35.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            -122.0,
            36.0,
            -112.0,
            36.0,
            -112.0,
            39.0,
            -122.0,
            39.0,
          ]),
          holes: [
            {
              positions: Cartesian3.fromDegreesArray([
                -120.0,
                36.5,
                -120.0,
                38.5,
                -114.0,
                38.5,
                -114.0,
                36.5,
              ]),
            },
          ],
        },
      ],
    };

    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3);
    expect(p.indices.length).toEqual(10 * 3);
  });

  it("doesn't reverse clockwise input array", function () {
    const p = Cartesian3.fromDegreesArray([
      -124.0,
      35.0,
      -124.0,
      40.0,
      -110.0,
      40.0,
      -110.0,
      35.0,
    ]);
    const h1 = Cartesian3.fromDegreesArray([
      -122.0,
      36.0,
      -112.0,
      36.0,
      -112.0,
      39.0,
      -122.0,
      39.0,
    ]);
    const h2 = Cartesian3.fromDegreesArray([
      -120.0,
      36.5,
      -120.0,
      38.5,
      -114.0,
      38.5,
      -114.0,
      36.5,
    ]);
    const hierarchy = {
      positions: p,
      holes: [
        {
          positions: h1,
          holes: [
            {
              positions: h2,
            },
          ],
        },
      ],
    };

    PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    let i;
    const pExpected = Cartesian3.fromDegreesArray([
      -124.0,
      35.0,
      -124.0,
      40.0,
      -110.0,
      40.0,
      -110.0,
      35.0,
    ]);
    for (i = 0; i < p.length; i++) {
      expect(p[i]).toEqualEpsilon(pExpected[i], CesiumMath.EPSILON7);
    }

    const h1Expected = Cartesian3.fromDegreesArray([
      -122.0,
      36.0,
      -112.0,
      36.0,
      -112.0,
      39.0,
      -122.0,
      39.0,
    ]);
    for (i = 0; i < h1.length; i++) {
      expect(h1[i]).toEqualEpsilon(h1Expected[i], CesiumMath.EPSILON7);
    }

    const h2Expected = Cartesian3.fromDegreesArray([
      -120.0,
      36.5,
      -120.0,
      38.5,
      -114.0,
      38.5,
      -114.0,
      36.5,
    ]);
    for (i = 0; i < h2.length; i++) {
      expect(h2[i]).toEqualEpsilon(h2Expected[i], CesiumMath.EPSILON7);
    }
  });

  it("computes correct bounding sphere at height 0", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.ALL,
        positions: Cartesian3.fromDegreesArray([
          -108.0,
          1.0,
          -108.0,
          -1.0,
          -106.0,
          -1.0,
          -106.0,
          1.0,
        ]),
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    const bs = BoundingSphere.fromVertices(p.attributes.position.values);
    expect(p.boundingSphere.center).toEqualEpsilon(
      bs.center,
      CesiumMath.EPSILON9
    );
    expect(p.boundingSphere.radius).toEqualEpsilon(
      bs.radius,
      CesiumMath.EPSILON9
    );
  });

  it("computes correct bounding sphere at height >>> 0", function () {
    const height = 40000000.0;
    const positions = Cartesian3.fromDegreesArray([
      -108.0,
      1.0,
      -108.0,
      -1.0,
      -106.0,
      -1.0,
      -106.0,
      1.0,
    ]);

    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITIONS_ONLY,
        positions: positions,
        height: height,
      })
    );

    const bs = BoundingSphere.fromPoints(
      Cartesian3.fromDegreesArrayHeights([
        -108.0,
        1.0,
        height,
        -108.0,
        -1.0,
        height,
        -106.0,
        -1.0,
        height,
        -106.0,
        1.0,
        height,
      ])
    );
    expect(Math.abs(p.boundingSphere.radius - bs.radius)).toBeLessThan(100.0);
  });

  it("computes positions extruded", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
      })
    );

    const numVertices = 50; // 13 top + 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    const numTriangles = 48; // 16 top fill + 16 bottom fill + 2 triangles * 4 sides
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions extruded and not closeTop", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
      })
    );

    const numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    const numTriangles = 32; // 16 bottom fill + 2 triangles * 4 sides
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions extruded and not closeBottom", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeBottom: false,
      })
    );

    const numVertices = 37; // 13 top + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    const numTriangles = 32; // 16 top fill + 2 triangles * 4 sides
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("computes positions extruded and not closeBottom or closeTop", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
        closeBottom: false,
      })
    );

    const numVertices = 24; // 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    const numTriangles = 16; // 2 triangles * 4 sides
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("computes offset attribute", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        granularity: CesiumMath.RADIANS_PER_DEGREE,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 13;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 50;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length)
      .fill(0)
      .fill(1, 0, 13)
      .fill(1, 26, 38);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeTop for top vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 13, 25);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeBottom for top vertcies", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeBottom: false,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 37;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 0, 25);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeBottom or closeTop for top vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
        closeBottom: false,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 24;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 0, 12);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 50;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeTop for all vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeBottom for all vertcies", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeBottom: false,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 37;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded and not closeBottom or closeTop for all vertices", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        extrudedHeight: 30000,
        closeTop: false,
        closeBottom: false,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 24;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("removes duplicates extruded", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
          -1.0,
          -1.0,
        ]),
        extrudedHeight: 30000,
      })
    );

    expect(p.attributes.position.values.length).toEqual(50 * 3);
    expect(p.indices.length).toEqual(48 * 3);
  });

  it("Ignores extrudedHeight if it equals height.", function () {
    const p = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: Cartesian3.fromDegreesArray([
          -1.0,
          -1.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          1.0,
        ]),
        height: 0,
        extrudedHeight: CesiumMath.EPSILON7,
      })
    );

    expect(p.attributes.position.values.length).toEqual(13 * 3);
    expect(p.indices.length).toEqual(16 * 3);
  });

  it("computes all attributes extruded", function () {
    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.ALL,
        polygonHierarchy: {
          positions: Cartesian3.fromDegreesArray([
            -1.0,
            -1.0,
            1.0,
            -1.0,
            1.0,
            1.0,
            -1.0,
            1.0,
          ]),
        },
        extrudedHeight: 30000,
      })
    );

    const numVertices = 50;
    const numTriangles = 48;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    expect(p.attributes.st.values.length).toEqual(numVertices * 2);
    expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(p.indices.length).toEqual(numTriangles * 3);
  });

  it("computes correct texture coordinates for polygon with height", function () {
    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        polygonHierarchy: {
          positions: Cartesian3.fromDegreesArray([
            -100.5,
            30.0,
            -100.0,
            30.0,
            -100.0,
            30.5,
            -100.5,
            30.5,
          ]),
        },
        height: 150000,
        granularity: CesiumMath.PI,
      })
    );

    const st = p.attributes.st.values;
    for (let i = 0; i < st.length; i++) {
      expect(st[i]).toBeGreaterThanOrEqual(0);
      expect(st[i]).toBeLessThanOrEqual(1);
    }
  });

  it("computes correct texture coordinates for polygon with position heights", function () {
    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        polygonHierarchy: {
          positions: Cartesian3.fromDegreesArrayHeights([
            -100.5,
            30.0,
            92,
            -100.0,
            30.0,
            92,
            -100.0,
            30.5,
            92,
            -100.5,
            30.5,
            92,
          ]),
        },
        granularity: CesiumMath.PI,
      })
    );

    const st = p.attributes.st.values;
    for (let i = 0; i < st.length; i++) {
      expect(st[i]).toBeGreaterThanOrEqual(0);
      expect(st[i]).toBeLessThanOrEqual(1);
    }
  });

  it("uses explicit texture coordinates if defined in options", function () {
    const textureCoordinates = {
      positions: [
        new Cartesian2(0, 0),
        new Cartesian2(1, 0),
        new Cartesian2(1, 1),
        new Cartesian2(0, 1),
      ],
    };
    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        polygonHierarchy: {
          positions: Cartesian3.fromDegreesArray([
            -100.5,
            30.0,
            -100.0,
            30.0,
            -100.0,
            30.5,
            -100.5,
            30.5,
          ]),
        },
        textureCoordinates: textureCoordinates,
        height: 150000,
        granularity: CesiumMath.PI,
      })
    );

    const st = p.attributes.st.values;
    for (let i = 0; i < textureCoordinates.positions.length; i++) {
      expect(st[i * 2 + 0]).toEqual(textureCoordinates.positions[i].x);
      expect(st[i * 2 + 1]).toEqual(textureCoordinates.positions[i].y);
    }
  });

  it("creates a polygon from hierarchy extruded", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -110.0,
        35.0,
        -110.0,
        40.0,
        -124.0,
        40.0,
      ]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            -122.0,
            36.0,
            -122.0,
            39.0,
            -112.0,
            39.0,
            -112.0,
            36.0,
          ]),
          holes: [
            {
              positions: Cartesian3.fromDegreesArray([
                -120.0,
                36.5,
                -114.0,
                36.5,
                -114.0,
                38.5,
                -120.0,
                38.5,
              ]),
            },
          ],
        },
      ],
    };

    const p = PolygonGeometry.createGeometry(
      new PolygonGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
        extrudedHeight: 30000,
      })
    );

    // (4 points * 3 rectangles * 3 to duplicate for normals) * 2 for top and bottom
    expect(p.attributes.position.values.length).toEqual(72 * 3);
    // 10 top + 10 bottom + 2 triangles * 12 walls
    expect(p.indices.length).toEqual(44 * 3);
  });

  it("undefined is returned if there are less than 3 positions", function () {
    const polygon = PolygonGeometry.fromPositions({
      positions: Cartesian3.fromDegreesArray([-72.0, 40.0, -68.0, 40.0]),
    });

    const geometry = PolygonGeometry.createGeometry(polygon);

    expect(geometry).toBeUndefined();
  });

  it("computes normals for perPositionHeight", function () {
    let geometry = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: [
          new Cartesian3(
            1333485.211963876,
            -4654510.505548239,
            4138557.5850382405
          ),
          new Cartesian3(
            1333441.3994441305,
            -4654261.147368878,
            4138322.784348336
          ),
          new Cartesian3(
            1333521.9333286814,
            -4654490.298890729,
            4138567.564118971
          ),
        ],
        extrudedHeight: 56,
        vertexFormat: VertexFormat.POSITION_AND_NORMAL,
        perPositionHeight: true,
        closeBottom: false,
      })
    );

    const normals = geometry.attributes.normal.values;

    geometry = GeometryPipeline.computeNormal(geometry);
    const expectedNormals = geometry.attributes.normal.values;

    let notEqualCount = 0;
    for (let i = 0; i < expectedNormals.length; i++) {
      if (
        !CesiumMath.equalsEpsilon(
          normals[i],
          expectedNormals[i],
          CesiumMath.EPSILON6
        )
      ) {
        notEqualCount++;
      }
    }

    //Exactly 2 normals will be different due to weird triangles on the walls of the extrusion
    //PolygonGeometry needs major changes to how extruded walls are computed with perPositionHeight in order to improve this
    expect(notEqualCount).toEqual(6);
  });

  it("computes geometry with position only vertex format with perPositionHeight and extrudedHeight", function () {
    const positions = Cartesian3.fromDegreesArrayHeights([
      -1.0,
      -1.0,
      100.0,
      1.0,
      -1.0,
      0.0,
      1.0,
      1.0,
      100.0,
      -1.0,
      1.0,
      0.0,
    ]);
    const geometry = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        positions: positions,
        extrudedHeight: 0,
        vertexFormat: VertexFormat.POSITION_ONLY,
        perPositionHeight: true,
      })
    );
    expect(geometry).toBeDefined();
    expect(geometry.attributes.position).toBeDefined();
    expect(geometry.attributes.normal).toBeUndefined();
  });

  it("does not include indices for extruded walls that are too small", function () {
    const positions = Cartesian3.fromDegreesArray([
      7.757161063097392,
      48.568676799636634,
      7.753968290229146,
      48.571796467099077,
      7.755340073906587,
      48.571948854067948,
      7.756263393414589,
      48.571947951609708,
      7.756894446412183,
      48.569396703043992,
    ]);

    const pRhumb = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: positions,
        extrudedHeight: 1000,
        closeTop: false,
        closeBottom: false,
        arcType: ArcType.RHUMB,
      })
    );

    let numVertices = 20;
    let numTriangles = 10; //5 wall segments, 2 triangles each wall
    expect(pRhumb.attributes.position.values.length).toEqual(numVertices * 3);
    expect(pRhumb.indices.length).toEqual(numTriangles * 3);

    const pGeodesic = PolygonGeometry.createGeometry(
      PolygonGeometry.fromPositions({
        vertexFormat: VertexFormat.POSITION_ONLY,
        positions: positions,
        extrudedHeight: 1000,
        closeTop: false,
        closeBottom: false,
        arcType: ArcType.GEODESIC,
      })
    );

    numVertices = 20;
    numTriangles = 10;
    expect(pGeodesic.attributes.position.values.length).toEqual(
      numVertices * 3
    );
    expect(pGeodesic.indices.length).toEqual(numTriangles * 3);
  });

  it("computing rectangle property", function () {
    const p = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -100.5,
          30.0,
          92,
          -100.0,
          30.0,
          92,
          -100.0,
          30.5,
          92,
          -100.5,
          30.5,
          92,
        ]),
      },
      granularity: CesiumMath.PI,
    });

    const r = p.rectangle;
    expect(CesiumMath.toDegrees(r.north)).toEqualEpsilon(
      30.5,
      CesiumMath.EPSILON13
    );
    expect(CesiumMath.toDegrees(r.south)).toEqualEpsilon(
      30.0,
      CesiumMath.EPSILON13
    );
    expect(CesiumMath.toDegrees(r.east)).toEqualEpsilon(
      -100.0,
      CesiumMath.EPSILON13
    );
    expect(CesiumMath.toDegrees(r.west)).toEqualEpsilon(
      -100.5,
      CesiumMath.EPSILON13
    );
  });

  it("computes rectangle according to arctype", function () {
    const pGeodesic = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -90.0,
          30.0,
          0,
          -80.0,
          30.0,
          0,
          -80.0,
          40.0,
          0,
          -90.0,
          40.0,
          0,
        ]),
      },
      granularity: CesiumMath.RADIANS_PER_DEGREE,
      arcType: ArcType.GEODESIC,
    });

    const boundingGeodesic = pGeodesic.rectangle;
    expect(CesiumMath.toDegrees(boundingGeodesic.north)).toBeGreaterThan(40.0);
    expect(CesiumMath.toDegrees(boundingGeodesic.south)).toEqualEpsilon(
      30.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingGeodesic.east)).toEqualEpsilon(
      -80.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingGeodesic.west)).toEqualEpsilon(
      -90.0,
      CesiumMath.EPSILON10
    );

    const pRhumb = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -90.0,
          30.0,
          0,
          -80.0,
          30.0,
          0,
          -80.0,
          40.0,
          0,
          -90.0,
          40.0,
          0,
        ]),
      },
      granularity: CesiumMath.RADIANS_PER_DEGREE,
      arcType: ArcType.RHUMB,
    });

    const boundingRhumb = pRhumb.rectangle;
    expect(CesiumMath.toDegrees(boundingRhumb.north)).toEqualEpsilon(
      40.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.south)).toEqualEpsilon(
      30.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.east)).toEqualEpsilon(
      -80.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.west)).toEqualEpsilon(
      -90.0,
      CesiumMath.EPSILON10
    );
  });

  it("computes rectangles for rhumbline polygons that cross the IDL", function () {
    const pRhumb = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArray([
          175,
          30,
          -170,
          30,
          -170,
          40,
          175,
          40,
        ]),
      },
      granularity: CesiumMath.RADIANS_PER_DEGREE,
      arcType: ArcType.RHUMB,
    });

    const boundingRhumb = pRhumb.rectangle;
    expect(CesiumMath.toDegrees(boundingRhumb.north)).toEqualEpsilon(
      40.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.south)).toEqualEpsilon(
      30.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.east)).toEqualEpsilon(
      -170.0,
      CesiumMath.EPSILON10
    );
    expect(CesiumMath.toDegrees(boundingRhumb.west)).toEqualEpsilon(
      175.0,
      CesiumMath.EPSILON10
    );
  });

  it("computes rectangles for geodesic polygons that cross the IDL", function () {
    const minLon = Cartographic.fromDegrees(-178, 3);
    const minLat = Cartographic.fromDegrees(-179, -4);
    const maxLon = Cartographic.fromDegrees(178, 3);
    const maxLat = Cartographic.fromDegrees(179, 4);
    const cartesianArray = Ellipsoid.WGS84.cartographicArrayToCartesianArray([
      minLat,
      minLon,
      maxLat,
      maxLon,
    ]);

    const pGeodesic = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: cartesianArray,
      },
      granularity: CesiumMath.RADIANS_PER_DEGREE,
      arcType: ArcType.GEODESIC,
    });

    const boundingGeodesic = pGeodesic.rectangle;
    expect(boundingGeodesic.east).toEqualEpsilon(
      minLon.longitude,
      CesiumMath.EPSILON10
    );
    expect(boundingGeodesic.south).toEqualEpsilon(
      minLat.latitude,
      CesiumMath.EPSILON10
    );
    expect(boundingGeodesic.west).toEqualEpsilon(
      maxLon.longitude,
      CesiumMath.EPSILON10
    );
    expect(boundingGeodesic.north).toEqualEpsilon(
      maxLat.latitude,
      CesiumMath.EPSILON10
    );
  });

  it("computeRectangle", function () {
    const options = {
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -100.5,
          30.0,
          92,
          -100.0,
          30.0,
          92,
          -100.0,
          30.5,
          92,
          -100.5,
          30.5,
          92,
        ]),
      },
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    };
    const geometry = new PolygonGeometry(options);

    const expected = geometry.rectangle;
    const result = PolygonGeometry.computeRectangle(options);

    expect(result).toEqual(expected);
  });

  it("computeRectangle with result parameter", function () {
    const options = {
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArray([
          -10.5,
          25.0,
          -10.0,
          25.0,
          -10.0,
          25.5,
          -10.5,
          25.5,
        ]),
      },
    };
    const geometry = new PolygonGeometry(options);

    const result = new Rectangle();
    const expected = geometry.rectangle;
    const returned = PolygonGeometry.computeRectangle(options, result);

    expect(returned).toEqual(expected);
    expect(returned).toBe(result);
  });

  it("computing textureCoordinateRotationPoints property", function () {
    let p = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -10.0,
          -10.0,
          0,
          -10.0,
          10.0,
          0,
          10.0,
          -10.0,
          0,
          10.0,
          10.0,
          0,
        ]),
      },
      granularity: CesiumMath.PI,
      stRotation: CesiumMath.toRadians(90),
    });

    // 90 degree rotation means (0, 1) should be the new min and (1, 1) (0, 0) are extents
    let textureCoordinateRotationPoints = p.textureCoordinateRotationPoints;
    expect(textureCoordinateRotationPoints.length).toEqual(6);
    expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );

    p = new PolygonGeometry({
      vertexFormat: VertexFormat.POSITION_AND_ST,
      polygonHierarchy: {
        positions: Cartesian3.fromDegreesArrayHeights([
          -10.0,
          -10.0,
          0,
          -10.0,
          10.0,
          0,
          10.0,
          -10.0,
          0,
          10.0,
          10.0,
          0,
        ]),
      },
      granularity: CesiumMath.PI,
      stRotation: CesiumMath.toRadians(0),
    });

    textureCoordinateRotationPoints = p.textureCoordinateRotationPoints;
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

  const polygon = new PolygonGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    polygonHierarchy: hierarchy,
    granularity: CesiumMath.PI_OVER_THREE,
    perPositionHeight: true,
    closeTop: false,
    closeBottom: true,
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
  packedInstance.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  packedInstance.push(
    0.0,
    0.0,
    CesiumMath.PI_OVER_THREE,
    0.0,
    0.0,
    1.0,
    0,
    1,
    0,
    -1,
    ArcType.GEODESIC,
    -1,
    55
  );
  createPackableSpecs(PolygonGeometry, polygon, packedInstance);

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

  const polygonTextured = new PolygonGeometry({
    vertexFormat: VertexFormat.POSITION_ONLY,
    polygonHierarchy: hierarchy,
    textureCoordinates: textureCoordinates,
    granularity: CesiumMath.PI_OVER_THREE,
    perPositionHeight: true,
    closeTop: false,
    closeBottom: true,
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
  packedInstanceTextured.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  packedInstanceTextured.push(
    0.0,
    0.0,
    CesiumMath.PI_OVER_THREE,
    0.0,
    0.0,
    1.0,
    0,
    1,
    0,
    -1,
    ArcType.GEODESIC
  );
  packedInstanceTextured.push(9.0, 0.0);
  addPositions2D(packedInstanceTextured, textureCoordinates.positions);
  packedInstanceTextured.push(74);
  createPackableSpecs(PolygonGeometry, polygonTextured, packedInstanceTextured);
});
