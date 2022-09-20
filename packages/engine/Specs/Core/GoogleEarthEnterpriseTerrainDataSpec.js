import {
  Cartesian3,
  Cartographic,
  Ellipsoid,
  GeographicTilingScheme,
  GoogleEarthEnterpriseTerrainData,
  Rectangle,
  TerrainData,
  TerrainMesh,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/GoogleEarthEnterpriseTerrainData", function () {
  const sizeOfUint8 = Uint8Array.BYTES_PER_ELEMENT;
  const sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
  const sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
  const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
  const sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
  const sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;
  const toEarthRadii = 1.0 / 6371010.0;

  function getBuffer(tilingScheme, x, y, level) {
    const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
    const center = Rectangle.center(rectangle);
    const southwest = Rectangle.southwest(rectangle);
    const stepX = CesiumMath.toDegrees(rectangle.width / 2) / 180.0;
    const stepY = CesiumMath.toDegrees(rectangle.height / 2) / 180.0;

    // 2 Uint8s: x and y values in units of step
    const pointSize = 2 * sizeOfUint8 + sizeOfFloat;

    // 3 shorts
    const faceSize = 3 * sizeOfUint16;

    // Doubles: OriginX, OriginY, SizeX, SizeY
    // Int32s: numPoints, numFaces, level
    // 4 corner points
    // 2 face (3 shorts)
    const quadSize =
      4 * sizeOfDouble + 3 * sizeOfInt32 + 4 * pointSize + 2 * faceSize;

    // QuadSize + size of each quad
    const totalSize = 4 * (quadSize + sizeOfUint32);
    const buf = new ArrayBuffer(totalSize);
    const dv = new DataView(buf);

    let altitudeStart = 0;
    let offset = 0;
    for (let i = 0; i < 4; ++i) {
      altitudeStart = 0;
      dv.setUint32(offset, quadSize, true);
      offset += sizeOfUint32;

      // Origin
      let xOrigin = southwest.longitude;
      let yOrigin = southwest.latitude;

      if ((i & 2) !== 0) {
        // Top row
        if ((i & 1) === 0) {
          // NE
          xOrigin = center.longitude;
          altitudeStart = 10;
        }
        yOrigin = center.latitude;
      } else if ((i & 1) !== 0) {
        // SE
        xOrigin = center.longitude;
        altitudeStart = 10;
      }

      dv.setFloat64(offset, CesiumMath.toDegrees(xOrigin) / 180.0, true);
      offset += sizeOfDouble;
      dv.setFloat64(offset, CesiumMath.toDegrees(yOrigin) / 180.0, true);
      offset += sizeOfDouble;

      // Step - Each step is a degree
      dv.setFloat64(offset, stepX, true);
      offset += sizeOfDouble;
      dv.setFloat64(offset, stepY, true);
      offset += sizeOfDouble;

      // NumPoints
      dv.setInt32(offset, 4, true);
      offset += sizeOfInt32;

      // NumFaces
      dv.setInt32(offset, 2, true);
      offset += sizeOfInt32;

      // Level
      dv.setInt32(offset, 0, true);
      offset += sizeOfInt32;

      // Points
      let j;
      for (j = 0; j < 4; ++j) {
        let xPos = 0;
        let yPos = 0;
        let altitude = altitudeStart;
        if (j & 1) {
          ++xPos;
          altitude += 10;
        }
        if (j & 2) {
          ++yPos;
        }

        dv.setUint8(offset++, xPos);
        dv.setUint8(offset++, yPos);
        dv.setFloat32(offset, altitude * toEarthRadii, true);
        offset += sizeOfFloat;
      }

      // Faces
      const indices = [0, 1, 2, 1, 3, 2];
      for (j = 0; j < indices.length; ++j) {
        dv.setUint16(offset, indices[j], true);
        offset += sizeOfUint16;
      }
    }

    return buf;
  }

  it("conforms to TerrainData interface", function () {
    expect(GoogleEarthEnterpriseTerrainData).toConformToInterface(TerrainData);
  });

  describe("upsample", function () {
    it("works for all four children of a simple quad", function () {
      const maxShort = 32767;
      let tilingScheme = new GeographicTilingScheme();
      const buffer = getBuffer(tilingScheme, 0, 0, 0);
      const data = new GoogleEarthEnterpriseTerrainData({
        buffer: buffer,
        childTileMask: 15,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      tilingScheme = new GeographicTilingScheme();
      const childRectangles = [
        tilingScheme.tileXYToRectangle(0, 0, 1),
        tilingScheme.tileXYToRectangle(1, 0, 1),
        tilingScheme.tileXYToRectangle(0, 1, 1),
        tilingScheme.tileXYToRectangle(1, 1, 1),
      ];

      return Promise.resolve(
        data.createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: 0,
          level: 0,
        })
      )
        .then(function () {
          const swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
          const sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
          const nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
          const nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);
          return Promise.all([swPromise, sePromise, nwPromise, nePromise]);
        })
        .then(function (upsampleResults) {
          expect(upsampleResults.length).toBe(4);

          for (let i = 0; i < upsampleResults.length; ++i) {
            const upsampled = upsampleResults[i];
            expect(upsampled).toBeDefined();

            const uBuffer = upsampled._uValues;
            const vBuffer = upsampled._vValues;
            const ib = upsampled._indices;
            const heights = upsampled._heightValues;

            expect(uBuffer.length).toBe(4);
            expect(vBuffer.length).toBe(4);
            expect(heights.length).toBe(4);
            expect(ib.length).toBe(6);

            const rectangle = childRectangles[i];
            let north = 0;
            let south = 0;
            let east = 0;
            let west = 0;
            let index, u, v;
            for (let j = 0; j < ib.length; ++j) {
              index = ib[j];
              u =
                (uBuffer[index] / maxShort) * rectangle.width + rectangle.west;
              v =
                (vBuffer[index] / maxShort) * rectangle.height +
                rectangle.south;
              if (
                CesiumMath.equalsEpsilon(u, rectangle.west, CesiumMath.EPSILON7)
              ) {
                ++west;
              } else if (
                CesiumMath.equalsEpsilon(u, rectangle.east, CesiumMath.EPSILON7)
              ) {
                ++east;
              }

              if (
                CesiumMath.equalsEpsilon(
                  v,
                  rectangle.south,
                  CesiumMath.EPSILON7
                )
              ) {
                ++south;
              } else if (
                CesiumMath.equalsEpsilon(
                  v,
                  rectangle.north,
                  CesiumMath.EPSILON7
                )
              ) {
                ++north;
              }
            }

            // Each one is made up of 2 triangles
            expect(north).toEqual(3);
            expect(south).toEqual(3);
            expect(east).toEqual(3);
            expect(west).toEqual(3);

            // Each side of quad has 2 edge points
            expect(upsampled._westIndices.length).toEqual(2);
            expect(upsampled._southIndices.length).toEqual(2);
            expect(upsampled._eastIndices.length).toEqual(2);
            expect(upsampled._northIndices.length).toEqual(2);
          }
        });
    });
  });

  describe("createMesh", function () {
    let data;
    let tilingScheme;
    let buffer;

    beforeEach(function () {
      tilingScheme = new GeographicTilingScheme();
      buffer = getBuffer(tilingScheme, 0, 0, 0);
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: buffer,
        childTileMask: 15,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });
    });

    it("requires tilingScheme", function () {
      expect(function () {
        data.createMesh({
          tilingScheme: undefined,
          x: 0,
          y: 0,
          level: 0,
        });
      }).toThrowDeveloperError();
    });

    it("requires x", function () {
      expect(function () {
        data.createMesh({
          tilingScheme: tilingScheme,
          x: undefined,
          y: 0,
          level: 0,
        });
      }).toThrowDeveloperError();
    });

    it("requires y", function () {
      expect(function () {
        data.createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: undefined,
          level: 0,
        });
      }).toThrowDeveloperError();
    });

    it("requires level", function () {
      expect(function () {
        data.createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: 0,
          level: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("creates specified vertices plus skirt vertices", function () {
      const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);

      const wgs84 = Ellipsoid.WGS84;
      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: 0,
          level: 0,
        })
        .then(function (mesh) {
          expect(mesh).toBeInstanceOf(TerrainMesh);
          expect(mesh.vertices.length).toBe(17 * mesh.encoding.stride); // 9 regular + 8 skirt vertices
          expect(mesh.indices.length).toBe(4 * 6 * 3); // 2 regular + 4 skirt triangles per quad
          expect(mesh.minimumHeight).toBe(0);
          expect(mesh.maximumHeight).toBeCloseTo(20, 5);

          const encoding = mesh.encoding;
          const cartesian = new Cartesian3();
          const cartographic = new Cartographic();
          const count = mesh.vertices.length / mesh.encoding.stride;
          for (let i = 0; i < count; ++i) {
            const height = encoding.decodeHeight(mesh.vertices, i);
            if (i < 9) {
              // Original vertices
              expect(height).toBeBetween(0, 20);

              // Only test on original positions as the skirts angle outward
              encoding.decodePosition(mesh.vertices, i, cartesian);
              wgs84.cartesianToCartographic(cartesian, cartographic);
              cartographic.longitude = CesiumMath.convertLongitudeRange(
                cartographic.longitude
              );
              expect(Rectangle.contains(rectangle, cartographic)).toBe(true);
            } else {
              // Skirts
              expect(height).toBeBetween(-1000, -980);
            }
          }
        });
    });

    it("exaggerates mesh", function () {
      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: 0,
          level: 0,
          exaggeration: 2,
        })
        .then(function (mesh) {
          expect(mesh).toBeInstanceOf(TerrainMesh);
          expect(mesh.vertices.length).toBe(17 * mesh.encoding.stride); // 9 regular + 8 skirt vertices
          expect(mesh.indices.length).toBe(4 * 6 * 3); // 2 regular + 4 skirt triangles per quad

          // Even though there's exaggeration, it doesn't affect the mesh's
          // height, bounding sphere, or any other bounding volumes.
          // The exaggeration is instead stored in the mesh's TerrainEncoding
          expect(mesh.minimumHeight).toBe(0);
          expect(mesh.maximumHeight).toBeCloseTo(20, 5);
          expect(mesh.encoding.exaggeration).toBe(2.0);

          const encoding = mesh.encoding;
          const count = mesh.vertices.length / mesh.encoding.stride;
          for (let i = 0; i < count; ++i) {
            const height = encoding.decodeHeight(mesh.vertices, i);
            if (i < 9) {
              // Original vertices
              expect(height).toBeBetween(0, 40);
            } else {
              // Skirts
              expect(height).toBeBetween(-1000, -960);
            }
          }
        });
    });
  });

  describe("interpolateHeight", function () {
    let tilingScheme;
    let rectangle;
    let mesh;

    beforeEach(function () {
      tilingScheme = new GeographicTilingScheme();
      rectangle = tilingScheme.tileXYToRectangle(7, 6, 5);
      const buffer = getBuffer(tilingScheme, 7, 6, 5);
      mesh = new GoogleEarthEnterpriseTerrainData({
        buffer: buffer,
        childTileMask: 15,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });
    });

    it("clamps coordinates if given a position outside the mesh", function () {
      expect(mesh.interpolateHeight(rectangle, 0.0, 0.0)).toBe(
        mesh.interpolateHeight(rectangle, rectangle.east, rectangle.south)
      );
    });

    it("returns a height interpolated from the correct triangle", function () {
      // position in the northwest quadrant of the tile.
      let longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.25;
      let latitude =
        rectangle.south + (rectangle.north - rectangle.south) * 0.75;

      let result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toBeBetween(0.0, 10.0);

      // position in the southeast quadrant of the tile.
      longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.75;
      latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.25;

      result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toBeBetween(10.0, 20.0);

      // position on the line between the southwest and northeast corners.
      longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.5;
      latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.5;

      result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toEqualEpsilon(10.0, 1e-6);
    });
  });

  describe("isChildAvailable", function () {
    let data;

    beforeEach(function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 15,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });
    });

    it("requires thisX", function () {
      expect(function () {
        data.isChildAvailable(undefined, 0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("requires thisY", function () {
      expect(function () {
        data.isChildAvailable(0, undefined, 0, 0);
      }).toThrowDeveloperError();
    });

    it("requires childX", function () {
      expect(function () {
        data.isChildAvailable(0, 0, undefined, 0);
      }).toThrowDeveloperError();
    });

    it("requires childY", function () {
      expect(function () {
        data.isChildAvailable(0, 0, 0, undefined);
      }).toThrowDeveloperError();
    });

    it("returns true for all children when child mask is not explicitly specified", function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
    });

    it("works when only southwest child is available", function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 1,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });

    it("works when only southeast child is available", function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 2,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
    });

    it("works when only northeast child is available", function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 4,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });

    it("works when only northwest child is available", function () {
      data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 8,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });
  });

  it("requires buffer", function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const data = new GoogleEarthEnterpriseTerrainData({
        childTileMask: 8,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });

  it("requires negativeAltitudeExponentBias", function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 8,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });

  it("requires negativeElevationThreshold", function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 8,
        negativeAltitudeExponentBias: 32,
      });
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });
});
