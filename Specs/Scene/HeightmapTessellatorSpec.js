import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { HeightmapTessellator } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";

describe("Scene/HeightmapTessellator", function () {
  it("throws when heightmap is not provided", function () {
    expect(function () {
      HeightmapTessellator.computeVertices();
    }).toThrowDeveloperError();

    expect(function () {
      HeightmapTessellator.computeVertices({
        width: 2,
        height: 2,
        vertices: [],
        nativeRectangle: {
          west: 10.0,
          south: 20.0,
          east: 20.0,
          north: 30.0,
        },
        skirtHeight: 10.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws when width or height is not provided", function () {
    expect(function () {
      HeightmapTessellator.computeVertices({
        heightmap: [1.0, 2.0, 3.0, 4.0],
        height: 2,
        vertices: [],
        nativeRectangle: {
          west: 10.0,
          south: 20.0,
          east: 20.0,
          north: 30.0,
        },
        skirtHeight: 10.0,
      });
    }).toThrowDeveloperError();

    expect(function () {
      HeightmapTessellator.computeVertices({
        heightmap: [1.0, 2.0, 3.0, 4.0],
        width: 2,
        vertices: [],
        nativeRectangle: {
          west: 10.0,
          south: 20.0,
          east: 20.0,
          north: 30.0,
        },
        skirtHeight: 10.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws when nativeRectangle is not provided", function () {
    expect(function () {
      HeightmapTessellator.computeVertices({
        heightmap: [1.0, 2.0, 3.0, 4.0],
        width: 2,
        height: 2,
        vertices: [],
        skirtHeight: 10.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws when skirtHeight is not provided", function () {
    expect(function () {
      HeightmapTessellator.computeVertices({
        heightmap: [1.0, 2.0, 3.0, 4.0],
        width: 2,
        height: 2,
        vertices: [],
        nativeRectangle: {
          west: 10.0,
          south: 20.0,
          east: 20.0,
          north: 30.0,
        },
      });
    }).toThrowDeveloperError();
  });

  function checkExpectedVertex(
    nativeRectangle,
    i,
    j,
    width,
    height,
    index,
    isEdge,
    vertices,
    heightmap,
    ellipsoid,
    skirtHeight
  ) {
    let latitude = CesiumMath.lerp(
      nativeRectangle.north,
      nativeRectangle.south,
      j / (height - 1)
    );
    latitude = CesiumMath.toRadians(latitude);
    let longitude = CesiumMath.lerp(
      nativeRectangle.west,
      nativeRectangle.east,
      i / (width - 1)
    );
    longitude = CesiumMath.toRadians(longitude);

    let heightSample = heightmap[j * width + i];

    if (isEdge) {
      heightSample -= skirtHeight;
    }

    const expectedVertexPosition = ellipsoid.cartographicToCartesian({
      longitude: longitude,
      latitude: latitude,
      height: heightSample,
    });

    index = index * 6;
    const vertexPosition = new Cartesian3(
      vertices[index],
      vertices[index + 1],
      vertices[index + 2]
    );

    expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
    expect(vertices[index + 3]).toEqual(heightSample);
    expect(vertices[index + 4]).toEqualEpsilon(
      i / (width - 1),
      CesiumMath.EPSILON7
    );
    expect(vertices[index + 5]).toEqualEpsilon(
      1.0 - j / (height - 1),
      CesiumMath.EPSILON7
    );
  }

  function checkExpectedQuantizedVertex(
    nativeRectangle,
    i,
    j,
    width,
    height,
    index,
    isEdge,
    vertices,
    heightmap,
    ellipsoid,
    skirtHeight,
    encoding
  ) {
    let latitude = CesiumMath.lerp(
      nativeRectangle.north,
      nativeRectangle.south,
      j / (height - 1)
    );
    latitude = CesiumMath.toRadians(latitude);
    let longitude = CesiumMath.lerp(
      nativeRectangle.west,
      nativeRectangle.east,
      i / (width - 1)
    );
    longitude = CesiumMath.toRadians(longitude);

    let heightSample = heightmap[j * width + i];

    if (isEdge) {
      heightSample -= skirtHeight;
    }

    const expectedVertexPosition = ellipsoid.cartographicToCartesian({
      longitude: longitude,
      latitude: latitude,
      height: heightSample,
    });

    expect(
      encoding.decodePosition(vertices, index, new Cartesian3())
    ).toEqualEpsilon(expectedVertexPosition, 1.0);
  }

  it("creates mesh without skirt", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
      width: width,
      height: height,
      skirtHeight: 0.0,
      nativeRectangle: {
        west: 10.0,
        south: 30.0,
        east: 20.0,
        north: 40.0,
      },
      rectangle: new Rectangle(
        CesiumMath.toRadians(10.0),
        CesiumMath.toRadians(30.0),
        CesiumMath.toRadians(20.0),
        CesiumMath.toRadians(40.0)
      ),
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const nativeRectangle = options.nativeRectangle;

    let index = 0;

    for (let j = 0; j < height; ++j) {
      for (let i = 0; i < width; ++i) {
        checkExpectedVertex(
          nativeRectangle,
          i,
          j,
          width,
          height,
          index++,
          false,
          vertices,
          options.heightmap,
          ellipsoid,
          options.skirtHeight
        );
      }
    }
  });

  it("creates mesh with skirt", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
      width: width,
      height: height,
      skirtHeight: 10.0,
      nativeRectangle: {
        west: 10.0,
        east: 20.0,
        south: 30.0,
        north: 40.0,
      },
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const nativeRectangle = options.nativeRectangle;

    let i, j;
    let index = 0;

    for (j = 0; j < height; ++j) {
      for (i = 0; i < width; ++i) {
        checkExpectedVertex(
          nativeRectangle,
          i,
          j,
          width,
          height,
          index++,
          false,
          vertices,
          options.heightmap,
          ellipsoid,
          options.skirtHeight
        );
      }
    }

    // Heightmap is expected to be ordered from west to east and north to south,
    // so flip i and j depending on how skirts are arranged.
    for (j = 0; j < height; ++j) {
      // West edge goes from south to north
      checkExpectedVertex(
        nativeRectangle,
        0,
        height - 1 - j,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight
      );
    }

    for (i = 0; i < height; ++i) {
      // South edge goes from east to west
      checkExpectedVertex(
        nativeRectangle,
        width - 1 - i,
        height - 1,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight
      );
    }

    for (j = 0; j < height; ++j) {
      // East edge goes from north to south
      checkExpectedVertex(
        nativeRectangle,
        width - 1,
        j,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight
      );
    }

    for (i = 0; i < height; ++i) {
      // North edge goes from west to east
      checkExpectedVertex(
        nativeRectangle,
        i,
        0,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight
      );
    }
  });

  it("creates quantized mesh", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
      width: width,
      height: height,
      skirtHeight: 10.0,
      nativeRectangle: {
        west: 0.01,
        east: 0.02,
        south: 0.01,
        north: 0.02,
      },
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const nativeRectangle = options.nativeRectangle;

    let i, j;
    let index = 0;

    for (j = 0; j < height; ++j) {
      for (i = 0; i < width; ++i) {
        checkExpectedQuantizedVertex(
          nativeRectangle,
          i,
          j,
          width,
          height,
          index++,
          false,
          vertices,
          options.heightmap,
          ellipsoid,
          options.skirtHeight,
          results.encoding
        );
      }
    }

    // Heightmap is expected to be ordered from west to east and north to south,
    // so flip i and j depending on how skirts are arranged.
    for (j = 0; j < height; ++j) {
      // West edge goes from south to north
      checkExpectedQuantizedVertex(
        nativeRectangle,
        0,
        height - 1 - j,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight,
        results.encoding
      );
    }

    for (i = 0; i < height; ++i) {
      // South edge goes from east to west
      checkExpectedQuantizedVertex(
        nativeRectangle,
        width - 1 - i,
        height - 1,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight,
        results.encoding
      );
    }

    for (j = 0; j < height; ++j) {
      // East edge goes from north to south
      checkExpectedQuantizedVertex(
        nativeRectangle,
        width - 1,
        j,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight,
        results.encoding
      );
    }

    for (i = 0; i < height; ++i) {
      // North edge goes from west to east
      checkExpectedQuantizedVertex(
        nativeRectangle,
        i,
        0,
        width,
        height,
        index++,
        true,
        vertices,
        options.heightmap,
        ellipsoid,
        options.skirtHeight,
        results.encoding
      );
    }
  });

  it("tessellates web mercator heightmaps", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
      width: width,
      height: height,
      skirtHeight: 0.0,
      nativeRectangle: {
        west: 1000000.0,
        east: 2000000.0,
        south: 3000000.0,
        north: 4000000.0,
      },
      isGeographic: false,
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const projection = new WebMercatorProjection(ellipsoid);
    const nativeRectangle = options.nativeRectangle;

    const geographicSouthwest = projection.unproject(
      new Cartesian2(nativeRectangle.west, nativeRectangle.south)
    );
    const geographicNortheast = projection.unproject(
      new Cartesian2(nativeRectangle.east, nativeRectangle.north)
    );

    for (let j = 0; j < height; ++j) {
      const y = CesiumMath.lerp(
        nativeRectangle.north,
        nativeRectangle.south,
        j / (height - 1)
      );
      for (let i = 0; i < width; ++i) {
        const x = CesiumMath.lerp(
          nativeRectangle.west,
          nativeRectangle.east,
          i / (width - 1)
        );

        const latLon = projection.unproject(new Cartesian2(x, y));
        const longitude = latLon.longitude;
        const latitude = latLon.latitude;

        const heightSample = options.heightmap[j * width + i];

        const expectedVertexPosition = ellipsoid.cartographicToCartesian({
          longitude: longitude,
          latitude: latitude,
          height: heightSample,
        });

        const index = (j * width + i) * 6;
        const vertexPosition = new Cartesian3(
          vertices[index],
          vertices[index + 1],
          vertices[index + 2]
        );

        const expectedU =
          (longitude - geographicSouthwest.longitude) /
          (geographicNortheast.longitude - geographicSouthwest.longitude);
        const expectedV =
          (latitude - geographicSouthwest.latitude) /
          (geographicNortheast.latitude - geographicSouthwest.latitude);

        expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
        expect(vertices[index + 3]).toEqual(heightSample);
        expect(vertices[index + 4]).toEqualEpsilon(
          expectedU,
          CesiumMath.EPSILON7
        );
        expect(vertices[index + 5]).toEqualEpsilon(
          expectedV,
          CesiumMath.EPSILON7
        );
      }
    }
  });

  it("supports multi-element little endian heights", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [
        1.0,
        2.0,
        100.0,
        3.0,
        4.0,
        100.0,
        5.0,
        6.0,
        100.0,
        7.0,
        8.0,
        100.0,
        9.0,
        10.0,
        100.0,
        11.0,
        12.0,
        100.0,
        13.0,
        14.0,
        100.0,
        15.0,
        16.0,
        100.0,
        17.0,
        18.0,
        100.0,
      ],
      width: width,
      height: height,
      skirtHeight: 0.0,
      nativeRectangle: {
        west: 10.0,
        south: 30.0,
        east: 20.0,
        north: 40.0,
      },
      rectangle: new Rectangle(
        CesiumMath.toRadians(10.0),
        CesiumMath.toRadians(30.0),
        CesiumMath.toRadians(20.0),
        CesiumMath.toRadians(40.0)
      ),
      structure: {
        stride: 3,
        elementsPerHeight: 2,
        elementMultiplier: 10,
      },
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const nativeRectangle = options.nativeRectangle;

    for (let j = 0; j < height; ++j) {
      let latitude = CesiumMath.lerp(
        nativeRectangle.north,
        nativeRectangle.south,
        j / (height - 1)
      );
      latitude = CesiumMath.toRadians(latitude);
      for (let i = 0; i < width; ++i) {
        let longitude = CesiumMath.lerp(
          nativeRectangle.west,
          nativeRectangle.east,
          i / (width - 1)
        );
        longitude = CesiumMath.toRadians(longitude);

        const heightSampleIndex = (j * width + i) * options.structure.stride;
        const heightSample =
          options.heightmap[heightSampleIndex] +
          options.heightmap[heightSampleIndex + 1] * 10.0;

        const expectedVertexPosition = ellipsoid.cartographicToCartesian({
          longitude: longitude,
          latitude: latitude,
          height: heightSample,
        });

        const index = (j * width + i) * 6;
        const vertexPosition = new Cartesian3(
          vertices[index],
          vertices[index + 1],
          vertices[index + 2]
        );

        expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
        expect(vertices[index + 3]).toEqual(heightSample);
        expect(vertices[index + 4]).toEqualEpsilon(
          i / (width - 1),
          CesiumMath.EPSILON7
        );
        expect(vertices[index + 5]).toEqualEpsilon(
          1.0 - j / (height - 1),
          CesiumMath.EPSILON7
        );
      }
    }
  });

  it("supports multi-element big endian heights", function () {
    const width = 3;
    const height = 3;
    const options = {
      heightmap: [
        1.0,
        2.0,
        100.0,
        3.0,
        4.0,
        100.0,
        5.0,
        6.0,
        100.0,
        7.0,
        8.0,
        100.0,
        9.0,
        10.0,
        100.0,
        11.0,
        12.0,
        100.0,
        13.0,
        14.0,
        100.0,
        15.0,
        16.0,
        100.0,
        17.0,
        18.0,
        100.0,
      ],
      width: width,
      height: height,
      skirtHeight: 0.0,
      nativeRectangle: {
        west: 10.0,
        south: 30.0,
        east: 20.0,
        north: 40.0,
      },
      rectangle: new Rectangle(
        CesiumMath.toRadians(10.0),
        CesiumMath.toRadians(30.0),
        CesiumMath.toRadians(20.0),
        CesiumMath.toRadians(40.0)
      ),
      structure: {
        stride: 3,
        elementsPerHeight: 2,
        elementMultiplier: 10,
        isBigEndian: true,
      },
    };
    const results = HeightmapTessellator.computeVertices(options);
    const vertices = results.vertices;

    const ellipsoid = Ellipsoid.WGS84;
    const nativeRectangle = options.nativeRectangle;

    for (let j = 0; j < height; ++j) {
      let latitude = CesiumMath.lerp(
        nativeRectangle.north,
        nativeRectangle.south,
        j / (height - 1)
      );
      latitude = CesiumMath.toRadians(latitude);
      for (let i = 0; i < width; ++i) {
        let longitude = CesiumMath.lerp(
          nativeRectangle.west,
          nativeRectangle.east,
          i / (width - 1)
        );
        longitude = CesiumMath.toRadians(longitude);

        const heightSampleIndex = (j * width + i) * options.structure.stride;
        const heightSample =
          options.heightmap[heightSampleIndex] * 10.0 +
          options.heightmap[heightSampleIndex + 1];

        const expectedVertexPosition = ellipsoid.cartographicToCartesian({
          longitude: longitude,
          latitude: latitude,
          height: heightSample,
        });

        const index = (j * width + i) * 6;
        const vertexPosition = new Cartesian3(
          vertices[index],
          vertices[index + 1],
          vertices[index + 2]
        );

        expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
        expect(vertices[index + 3]).toEqual(heightSample);
        expect(vertices[index + 4]).toEqualEpsilon(
          i / (width - 1),
          CesiumMath.EPSILON7
        );
        expect(vertices[index + 5]).toEqualEpsilon(
          1.0 - j / (height - 1),
          CesiumMath.EPSILON7
        );
      }
    }
  });
});
