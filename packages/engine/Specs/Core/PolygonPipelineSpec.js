import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  PolygonPipeline,
  WindingOrder,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/PolygonPipeline", function () {
  beforeEach(function () {
    CesiumMath.setRandomNumberSeed(0.0);
  });

  it("computeArea2D computes a positive area", function () {
    const area = PolygonPipeline.computeArea2D([
      new Cartesian2(0.0, 0.0),
      new Cartesian2(2.0, 0.0),
      new Cartesian2(2.0, 1.0),
      new Cartesian2(0.0, 1.0),
    ]);

    expect(area).toEqual(2.0);
  });

  it("computeArea2D computes a negative area", function () {
    const area = PolygonPipeline.computeArea2D([
      new Cartesian2(0.0, 0.0),
      new Cartesian2(0.0, 2.0),
      new Cartesian2(1.0, 2.0),
      new Cartesian2(1.0, 0.0),
    ]);

    expect(area).toEqual(-2.0);
  });

  it("computeArea2D throws without positions", function () {
    expect(function () {
      PolygonPipeline.computeArea2D();
    }).toThrowDeveloperError();
  });

  it("computeArea2D throws without three positions", function () {
    expect(function () {
      PolygonPipeline.computeArea2D([Cartesian3.ZERO, Cartesian3.ZERO]);
    }).toThrowDeveloperError();
  });

  ///////////////////////////////////////////////////////////////////////

  it("computeWindingOrder2D computes counter-clockwise", function () {
    const area = PolygonPipeline.computeWindingOrder2D([
      new Cartesian2(0.0, 0.0),
      new Cartesian2(2.0, 0.0),
      new Cartesian2(2.0, 1.0),
      new Cartesian2(0.0, 1.0),
    ]);

    expect(area).toEqual(WindingOrder.COUNTER_CLOCKWISE);
  });

  it("computeWindingOrder2D computes clockwise", function () {
    const area = PolygonPipeline.computeWindingOrder2D([
      new Cartesian2(0.0, 0.0),
      new Cartesian2(0.0, 2.0),
      new Cartesian2(1.0, 2.0),
      new Cartesian2(1.0, 0.0),
    ]);

    expect(area).toEqual(WindingOrder.CLOCKWISE);
  });

  it("computeWindingOrder2D throws without positions", function () {
    expect(function () {
      PolygonPipeline.computeWindingOrder2D();
    }).toThrowDeveloperError();
  });

  it("computeWindingOrder2D throws without three positions", function () {
    expect(function () {
      PolygonPipeline.computeWindingOrder2D([Cartesian3.ZERO, Cartesian3.ZERO]);
    }).toThrowDeveloperError();
  });

  describe("triangulate", function () {
    // Test integration with earcut.js
    // The package is tested independently. See https://github.com/mapbox/earcut

    it("throws without positions", function () {
      expect(function () {
        PolygonPipeline.triangulate(undefined, []);
      }).toThrowDeveloperError();
    });

    it("a triangle", function () {
      const positions = [
        new Cartesian2(0.0, 0.0),
        new Cartesian2(1.0, 0.0),
        new Cartesian2(0.0, 1.0),
      ];
      const indices = PolygonPipeline.triangulate(positions, []);
      expect(indices).toEqual([1, 2, 0]);
    });

    it("a square", function () {
      const positions = [
        new Cartesian2(0.0, 0.0),
        new Cartesian2(1.0, 0.0),
        new Cartesian2(1.0, 1.0),
        new Cartesian2(0.0, 1.0),
      ];
      const indices = PolygonPipeline.triangulate(positions, []);
      expect(indices).toEqual([2, 3, 0, 0, 1, 2]);
    });

    it("eliminates holes", function () {
      const positions = [
        new Cartesian2(0.0, 0.0),
        new Cartesian2(3.0, 0.0),
        new Cartesian2(3.0, 3.0),
        new Cartesian2(0.0, 3.0),
      ];
      const hole = [
        new Cartesian2(1.0, 1.0),
        new Cartesian2(2.0, 1.0),
        new Cartesian2(2.0, 2.0),
        new Cartesian2(1.0, 2.0),
      ];

      const combinedPositions = positions.concat(hole);
      const indices = PolygonPipeline.triangulate(combinedPositions, [4]);

      expect(indices).toEqual([
        0,
        4,
        7,
        5,
        4,
        0,
        3,
        0,
        7,
        5,
        0,
        1,
        2,
        3,
        7,
        6,
        5,
        1,
        2,
        7,
        6,
        6,
        1,
        2,
      ]);
    });

    it("eliminates multiple holes", function () {
      const positions = [
        new Cartesian2(0.0, 0.0),
        new Cartesian2(3.0, 0.0),
        new Cartesian2(3.0, 5.0),
        new Cartesian2(0.0, 5.0),
      ];
      const bottomHole = [
        new Cartesian2(1.0, 1.0),
        new Cartesian2(2.0, 1.0),
        new Cartesian2(2.0, 2.0),
        new Cartesian2(1.0, 2.0),
      ];
      const topHole = [
        new Cartesian2(1.0, 3.0),
        new Cartesian2(2.0, 3.0),
        new Cartesian2(2.0, 4.0),
        new Cartesian2(1.0, 4.0),
      ];

      const combinedPositions = positions.concat(bottomHole).concat(topHole);
      const indices = PolygonPipeline.triangulate(combinedPositions, [4, 8]);

      expect(indices).toEqual([
        0,
        8,
        11,
        0,
        4,
        7,
        5,
        4,
        0,
        3,
        0,
        11,
        8,
        0,
        7,
        5,
        0,
        1,
        2,
        3,
        11,
        9,
        8,
        7,
        6,
        5,
        1,
        2,
        11,
        10,
        9,
        7,
        6,
        6,
        1,
        2,
        2,
        10,
        9,
        9,
        6,
        2,
      ]);
    });
  });

  ///////////////////////////////////////////////////////////////////////

  it("computeSubdivision throws without ellipsoid", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision();
    }).toThrowDeveloperError();
  });

  it("computeSubdivision throws without positions", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision(Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("computeSubdivision throws without indices", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, []);
    }).toThrowDeveloperError();
  });

  it("computeSubdivision throws with less than 3 indices", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, [], [1, 2]);
    }).toThrowDeveloperError();
  });

  it("computeSubdivision throws without a multiple of 3 indices", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, [], [1, 2, 3, 4]);
    }).toThrowDeveloperError();
  });

  it("computeSubdivision throws with negative granularity", function () {
    expect(function () {
      PolygonPipeline.computeSubdivision(
        Ellipsoid.WGS84,
        [],
        [1, 2, 3],
        undefined,
        -1.0
      );
    }).toThrowDeveloperError();
  });

  it("computeSubdivision without subdivisions", function () {
    const positions = [
      new Cartesian3(0.0, 0.0, 90.0),
      new Cartesian3(0.0, 90.0, 0.0),
      new Cartesian3(90.0, 0.0, 0.0),
    ];
    const indices = [0, 1, 2];
    const subdivision = PolygonPipeline.computeSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      undefined,
      60.0
    );

    expect(subdivision.attributes.position.values[0]).toEqual(0.0);
    expect(subdivision.attributes.position.values[1]).toEqual(0.0);
    expect(subdivision.attributes.position.values[2]).toEqual(90.0);
    expect(subdivision.attributes.position.values[3]).toEqual(0.0);
    expect(subdivision.attributes.position.values[4]).toEqual(90.0);
    expect(subdivision.attributes.position.values[5]).toEqual(0.0);
    expect(subdivision.attributes.position.values[6]).toEqual(90.0);
    expect(subdivision.attributes.position.values[7]).toEqual(0.0);
    expect(subdivision.attributes.position.values[8]).toEqual(0.0);

    expect(subdivision.indices[0]).toEqual(0);
    expect(subdivision.indices[1]).toEqual(1);
    expect(subdivision.indices[2]).toEqual(2);
  });

  it("computeSubdivision with subdivisions", function () {
    const positions = [
      new Cartesian3(6377802.759444977, -58441.30561735455, 29025.647900582237),
      new Cartesian3(
        6377802.759444977,
        -58441.30561735455,
        -29025.647900582237
      ),
      new Cartesian3(6378137, 0, 0),
      new Cartesian3(6377802.759444977, 58441.30561735455, -29025.647900582237),
      new Cartesian3(6377802.759444977, 58441.30561735455, 29025.647900582237),
    ];
    const indices = [0, 1, 2, 2, 3, 4, 4, 0, 2];
    const subdivision = PolygonPipeline.computeSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices
    );

    expect(subdivision.attributes.position.values[0]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[1]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[2]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[3]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[4]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[5]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[6]).toEqual(6378137);
    expect(subdivision.attributes.position.values[7]).toEqual(0);
    expect(subdivision.attributes.position.values[8]).toEqual(0);
    expect(subdivision.attributes.position.values[9]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[10]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[11]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[12]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[13]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[14]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[15]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[16]).toEqual(0);
    expect(subdivision.attributes.position.values[17]).toEqual(
      29025.647900582237
    );

    expect(subdivision.indices[0]).toEqual(5);
    expect(subdivision.indices[1]).toEqual(0);
    expect(subdivision.indices[2]).toEqual(2);
    expect(subdivision.indices[3]).toEqual(4);
    expect(subdivision.indices[4]).toEqual(5);
    expect(subdivision.indices[5]).toEqual(2);
    expect(subdivision.indices[6]).toEqual(2);
    expect(subdivision.indices[7]).toEqual(3);
    expect(subdivision.indices[8]).toEqual(4);
    expect(subdivision.indices[9]).toEqual(0);
    expect(subdivision.indices[10]).toEqual(1);
    expect(subdivision.indices[11]).toEqual(2);
  });

  it("computeSubdivision with subdivisions with texcoords", function () {
    const positions = [
      new Cartesian3(6377802.759444977, -58441.30561735455, 29025.647900582237),
      new Cartesian3(
        6377802.759444977,
        -58441.30561735455,
        -29025.647900582237
      ),
      new Cartesian3(6378137, 0, 0),
      new Cartesian3(6377802.759444977, 58441.30561735455, -29025.647900582237),
      new Cartesian3(6377802.759444977, 58441.30561735455, 29025.647900582237),
    ];
    const indices = [0, 1, 2, 2, 3, 4, 4, 0, 2];
    const texcoords = [
      new Cartesian2(0, 1),
      new Cartesian2(0, 0),
      new Cartesian2(0.5, 0),
      new Cartesian2(1, 0),
      new Cartesian2(1, 1),
    ];
    const subdivision = PolygonPipeline.computeSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      texcoords
    );

    expect(subdivision.attributes.position.values[0]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[1]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[2]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[3]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[4]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[5]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[6]).toEqual(6378137);
    expect(subdivision.attributes.position.values[7]).toEqual(0);
    expect(subdivision.attributes.position.values[8]).toEqual(0);
    expect(subdivision.attributes.position.values[9]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[10]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[11]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[12]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[13]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[14]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[15]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[16]).toEqual(0);
    expect(subdivision.attributes.position.values[17]).toEqual(
      29025.647900582237
    );

    expect(subdivision.indices[0]).toEqual(5);
    expect(subdivision.indices[1]).toEqual(0);
    expect(subdivision.indices[2]).toEqual(2);
    expect(subdivision.indices[3]).toEqual(4);
    expect(subdivision.indices[4]).toEqual(5);
    expect(subdivision.indices[5]).toEqual(2);
    expect(subdivision.indices[6]).toEqual(2);
    expect(subdivision.indices[7]).toEqual(3);
    expect(subdivision.indices[8]).toEqual(4);
    expect(subdivision.indices[9]).toEqual(0);
    expect(subdivision.indices[10]).toEqual(1);
    expect(subdivision.indices[11]).toEqual(2);

    expect(subdivision.attributes.st.values[0]).toEqual(0);
    expect(subdivision.attributes.st.values[1]).toEqual(1);
    expect(subdivision.attributes.st.values[2]).toEqual(0);
    expect(subdivision.attributes.st.values[3]).toEqual(0);
    expect(subdivision.attributes.st.values[4]).toEqual(0.5);
    expect(subdivision.attributes.st.values[5]).toEqual(0);
    expect(subdivision.attributes.st.values[6]).toEqual(1);
    expect(subdivision.attributes.st.values[7]).toEqual(0);
    expect(subdivision.attributes.st.values[8]).toEqual(1);
    expect(subdivision.attributes.st.values[9]).toEqual(1);
    expect(subdivision.attributes.st.values[10]).toEqual(0.5);
    expect(subdivision.attributes.st.values[11]).toEqual(1);
  });
  ///////////////////////////////////////////////////////////////////////

  it("computeRhumbLineSubdivision throws without ellipsoid", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision();
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision throws without positions", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision(Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision throws without indices", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision(Ellipsoid.WGS84, []);
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision throws with less than 3 indices", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision(Ellipsoid.WGS84, [], [1, 2]);
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision throws without a multiple of 3 indices", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision(
        Ellipsoid.WGS84,
        [],
        [1, 2, 3, 4]
      );
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision throws with negative granularity", function () {
    expect(function () {
      PolygonPipeline.computeRhumbLineSubdivision(
        Ellipsoid.WGS84,
        [],
        [1, 2, 3],
        undefined,
        -1.0
      );
    }).toThrowDeveloperError();
  });

  it("computeRhumbLineSubdivision without subdivisions", function () {
    const positions = Cartesian3.fromDegreesArray([0, 0, 1, 0, 1, 1]);
    const indices = [0, 1, 2];
    const subdivision = PolygonPipeline.computeRhumbLineSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      undefined,
      2 * CesiumMath.RADIANS_PER_DEGREE
    );

    expect(subdivision.attributes.position.values[0]).toEqual(positions[0].x);
    expect(subdivision.attributes.position.values[1]).toEqual(positions[0].y);
    expect(subdivision.attributes.position.values[2]).toEqual(positions[0].y);
    expect(subdivision.attributes.position.values[3]).toEqual(positions[1].x);
    expect(subdivision.attributes.position.values[4]).toEqual(positions[1].y);
    expect(subdivision.attributes.position.values[5]).toEqual(positions[1].z);
    expect(subdivision.attributes.position.values[6]).toEqual(positions[2].x);
    expect(subdivision.attributes.position.values[7]).toEqual(positions[2].y);
    expect(subdivision.attributes.position.values[8]).toEqual(positions[2].z);

    expect(subdivision.indices[0]).toEqual(0);
    expect(subdivision.indices[1]).toEqual(1);
    expect(subdivision.indices[2]).toEqual(2);
  });

  it("computeRhumbLineSubdivision with subdivisions", function () {
    const positions = Cartesian3.fromDegreesArray([0, 0, 1, 0, 1, 1]);
    const indices = [0, 1, 2];
    const subdivision = PolygonPipeline.computeRhumbLineSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      undefined,
      0.5 * CesiumMath.RADIANS_PER_DEGREE
    );

    expect(subdivision.attributes.position.values.length).toEqual(36); // 12 vertices
    expect(subdivision.indices.length).toEqual(36); // 12 triangles
  });

  it("computeRhumbLineSubdivision with subdivisions across the IDL", function () {
    const positions = Cartesian3.fromDegreesArray([178, 0, -178, 0, -178, 1]);
    const indices = [0, 1, 2];
    const subdivision = PolygonPipeline.computeRhumbLineSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      undefined,
      0.5 * CesiumMath.RADIANS_PER_DEGREE
    );

    expect(subdivision.attributes.position.values.length).toEqual(180); // 60 vertices
    expect(subdivision.indices.length).toEqual(252); // 84 triangles
  });

  it("computeRhumbLineSubdivision with subdivisions with texcoords", function () {
    const positions = [
      new Cartesian3(6377802.759444977, -58441.30561735455, 29025.647900582237),
      new Cartesian3(
        6377802.759444977,
        -58441.30561735455,
        -29025.647900582237
      ),
      new Cartesian3(6378137, 0, 0),
      new Cartesian3(6377802.759444977, 58441.30561735455, -29025.647900582237),
      new Cartesian3(6377802.759444977, 58441.30561735455, 29025.647900582237),
    ];
    const indices = [0, 1, 2, 2, 3, 4, 4, 0, 2];
    const texcoords = [
      new Cartesian2(0, 1),
      new Cartesian2(0, 0),
      new Cartesian2(0.5, 0),
      new Cartesian2(1, 0),
      new Cartesian2(1, 1),
    ];
    const subdivision = PolygonPipeline.computeRhumbLineSubdivision(
      Ellipsoid.WGS84,
      positions,
      indices,
      texcoords
    );

    expect(subdivision.attributes.position.values[0]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[1]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[2]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[3]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[4]).toEqual(
      -58441.30561735455
    );
    expect(subdivision.attributes.position.values[5]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[6]).toEqual(6378137);
    expect(subdivision.attributes.position.values[7]).toEqual(0);
    expect(subdivision.attributes.position.values[8]).toEqual(0);
    expect(subdivision.attributes.position.values[9]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[10]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[11]).toEqual(
      -29025.647900582237
    );
    expect(subdivision.attributes.position.values[12]).toEqual(
      6377802.759444977
    );
    expect(subdivision.attributes.position.values[13]).toEqual(
      58441.30561735455
    );
    expect(subdivision.attributes.position.values[14]).toEqual(
      29025.647900582237
    );
    expect(subdivision.attributes.position.values[15]).toEqual(
      6378070.509533917
    );
    expect(subdivision.attributes.position.values[16]).toEqual(
      1.1064188644323841e-11
    );
    expect(subdivision.attributes.position.values[17]).toEqual(
      29025.64790058224
    );

    expect(subdivision.indices[0]).toEqual(5);
    expect(subdivision.indices[1]).toEqual(0);
    expect(subdivision.indices[2]).toEqual(2);
    expect(subdivision.indices[3]).toEqual(4);
    expect(subdivision.indices[4]).toEqual(5);
    expect(subdivision.indices[5]).toEqual(2);
    expect(subdivision.indices[6]).toEqual(2);
    expect(subdivision.indices[7]).toEqual(3);
    expect(subdivision.indices[8]).toEqual(4);
    expect(subdivision.indices[9]).toEqual(0);
    expect(subdivision.indices[10]).toEqual(1);
    expect(subdivision.indices[11]).toEqual(2);

    expect(subdivision.attributes.st.values[0]).toEqual(0);
    expect(subdivision.attributes.st.values[1]).toEqual(1);
    expect(subdivision.attributes.st.values[2]).toEqual(0);
    expect(subdivision.attributes.st.values[3]).toEqual(0);
    expect(subdivision.attributes.st.values[4]).toEqual(0.5);
    expect(subdivision.attributes.st.values[5]).toEqual(0);
    expect(subdivision.attributes.st.values[6]).toEqual(1);
    expect(subdivision.attributes.st.values[7]).toEqual(0);
    expect(subdivision.attributes.st.values[8]).toEqual(1);
    expect(subdivision.attributes.st.values[9]).toEqual(1);
    expect(subdivision.attributes.st.values[10]).toEqual(0.5);
    expect(subdivision.attributes.st.values[11]).toEqual(1);
  });
});
