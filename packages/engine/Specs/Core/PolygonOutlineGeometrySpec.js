import {
  ArcType,
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  GeometryOffsetAttribute,
  PolygonOutlineGeometry,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/PolygonOutlineGeometry", function () {
  it("throws without hierarchy", function () {
    expect(function () {
      return new PolygonOutlineGeometry();
    }).toThrowDeveloperError();
  });

  it("throws with height when perPositionHeight is true", function () {
    expect(function () {
      return new PolygonOutlineGeometry({
        height: 30,
        perPositionHeight: true,
      });
    }).toThrowDeveloperError();
  });

  it("throws without positions", function () {
    expect(function () {
      return PolygonOutlineGeometry.fromPositions();
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than three positions", function () {
    expect(
      PolygonOutlineGeometry.createGeometry(
        PolygonOutlineGeometry.fromPositions({
          positions: [new Cartesian3()],
        })
      )
    ).toBeUndefined();
  });

  it("returns undefined with polygon hierarchy with less than three positions", function () {
    expect(
      PolygonOutlineGeometry.createGeometry(
        new PolygonOutlineGeometry({
          polygonHierarchy: {
            positions: [Cartesian3.fromDegrees(0, 0)],
          },
        })
      )
    ).toBeUndefined();
  });

  it("throws if arcType is not valid", function () {
    expect(function () {
      return new PolygonOutlineGeometry({
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
    const geometry = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArray([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns undefined due to duplicate positions extruded", function () {
    const geometry = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    const geometry = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({ polygonHierarchy: hierarchy })
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

    const geometry = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({ polygonHierarchy: hierarchy })
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

    const geometry = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({
        polygonHierarchy: hierarchy,
        perPositionHeight: true,
      })
    );
    expect(geometry).toBeDefined();
  });

  it("computes positions", function () {
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    expect(p.attributes.position.values.length).toEqual(8 * 3);
    expect(p.indices.length).toEqual(8 * 2);
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
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    expect(p.attributes.position.values.length).toEqual(8 * 3); // 8 around edge
    expect(p.indices.length).toEqual(16); // 4 squares
  });

  it("create geometry throws if arcType is STRAIGHT", function () {
    expect(function () {
      PolygonOutlineGeometry.createGeometry(
        PolygonOutlineGeometry.fromPositions({
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
      -80.0,
      75.0,
      80.0,
      75.0,
      80.0,
      45.0,
      -80.0,
      45.0,
    ]);
    const geodesic = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
        positions: positions,
        granularity: CesiumMath.RADIANS_PER_DEGREE,
        arcType: ArcType.GEODESIC,
      })
    );
    const rhumb = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

  it("uses correct value with extrudedHeight and perPositionHeight", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const maxHeight = 100.0;
    const minHeight = 60.0;
    const extrudedHeight = 50.0;
    const positions = Cartesian3.fromDegreesArrayHeights([
      -1.0,
      -1.0,
      maxHeight,
      1.0,
      -1.0,
      minHeight,
      1.0,
      1.0,
      minHeight,
      -1.0,
      1.0,
      minHeight,
    ]);
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
        positions: positions,
        perPositionHeight: true,
        extrudedHeight: extrudedHeight,
      })
    );

    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 0)
      ).height
    ).toEqualEpsilon(maxHeight, CesiumMath.EPSILON6);
    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 3)
      ).height
    ).toEqualEpsilon(minHeight, CesiumMath.EPSILON6);
    expect(
      ellipsoid.cartesianToCartographic(
        Cartesian3.fromArray(p.attributes.position.values, 24)
      ).height
    ).toEqualEpsilon(extrudedHeight, CesiumMath.EPSILON6);
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

    const p = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3); // 4 corners * 3 rectangles
    expect(p.indices.length).toEqual(12 * 2);
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

    const p = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p.attributes.position.values.length).toEqual(12 * 3);
    expect(p.indices.length).toEqual(12 * 2);
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

    PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
      })
    );

    expect(p).toEqualEpsilon(
      Cartesian3.fromDegreesArray([
        -124.0,
        35.0,
        -124.0,
        40.0,
        -110.0,
        40.0,
        -110.0,
        35.0,
      ]),
      CesiumMath.EPSILON9
    );
    expect(h1).toEqualEpsilon(
      Cartesian3.fromDegreesArray([
        -122.0,
        36.0,
        -112.0,
        36.0,
        -112.0,
        39.0,
        -122.0,
        39.0,
      ]),
      CesiumMath.EPSILON9
    );
    expect(h2).toEqualEpsilon(
      Cartesian3.fromDegreesArray([
        -120.0,
        36.5,
        -120.0,
        38.5,
        -114.0,
        38.5,
        -114.0,
        36.5,
      ]),
      CesiumMath.EPSILON9
    );
  });

  it("computes correct bounding sphere at height 0", function () {
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    expect(p.attributes.position.values.length).toEqual(16 * 3); // 8 top + 8 bottom
    expect(p.indices.length).toEqual(20 * 2); // 8 top + 8 bottom + 4 edges
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

    const p = PolygonOutlineGeometry.createGeometry(
      new PolygonOutlineGeometry({
        polygonHierarchy: hierarchy,
        granularity: CesiumMath.PI_OVER_THREE,
        extrudedHeight: 30000,
      })
    );

    expect(p.attributes.position.values.length).toEqual(24 * 3); // 12 top + 12 bottom
    expect(p.indices.length).toEqual(36 * 2); // 12 top + 12 bottom + 12 edges
  });

  it("computes offset attribute", function () {
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 8;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);
    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    const numVertices = 16;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 0, 8);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const p = PolygonOutlineGeometry.createGeometry(
      PolygonOutlineGeometry.fromPositions({
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

    const numVertices = 16;
    expect(p.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = p.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("undefined is returned if there are less than 3 positions", function () {
    const polygonOutline = PolygonOutlineGeometry.fromPositions({
      positions: Cartesian3.fromDegreesArray([-72.0, 40.0, -68.0, 40.0]),
    });

    const geometry = PolygonOutlineGeometry.createGeometry(polygonOutline);

    expect(geometry).toBeUndefined();
  });

  const positions = Cartesian3.fromDegreesArray([
    -124.0,
    35.0,
    -110.0,
    35.0,
    -110.0,
    40.0,
  ]);
  const holePositions0 = Cartesian3.fromDegreesArray([
    -122.0,
    36.0,
    -122.0,
    39.0,
    -112.0,
    39.0,
  ]);
  const holePositions1 = Cartesian3.fromDegreesArray([
    -120.0,
    36.5,
    -114.0,
    36.5,
    -114.0,
    38.5,
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
  const polygon = new PolygonOutlineGeometry({
    polygonHierarchy: hierarchy,
    granularity: CesiumMath.PI_OVER_THREE,
    perPositionHeight: true,
  });
  function addPositions(array, positions) {
    for (let i = 0; i < positions.length; ++i) {
      array.push(positions[i].x, positions[i].y, positions[i].z);
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
  packedInstance.push(
    0.0,
    0.0,
    CesiumMath.PI_OVER_THREE,
    0.0,
    1.0,
    ArcType.GEODESIC,
    -1,
    44
  );
  createPackableSpecs(PolygonOutlineGeometry, polygon, packedInstance);
});
