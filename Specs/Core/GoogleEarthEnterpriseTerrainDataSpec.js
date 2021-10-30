import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseTerrainData } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { TerrainData } from "../../Source/Cesium.js";
import { TerrainMesh } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Core/GoogleEarthEnterpriseTerrainData", function () {
  var sizeOfUint8 = Uint8Array.BYTES_PER_ELEMENT;
  var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
  var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
  var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
  var sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
  var sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;
  var toEarthRadii = 1.0 / 6371010.0;

  function getBuffer(tilingScheme, x, y, level) {
    var rectangle = tilingScheme.tileXYToRectangle(x, y, level);
    var center = Rectangle.center(rectangle);
    var southwest = Rectangle.southwest(rectangle);
    var stepX = CesiumMath.toDegrees(rectangle.width / 2) / 180.0;
    var stepY = CesiumMath.toDegrees(rectangle.height / 2) / 180.0;

    // 2 Uint8s: x and y values in units of step
    var pointSize = 2 * sizeOfUint8 + sizeOfFloat;

    // 3 shorts
    var faceSize = 3 * sizeOfUint16;

    // Doubles: OriginX, OriginY, SizeX, SizeY
    // Int32s: numPoints, numFaces, level
    // 4 corner points
    // 2 face (3 shorts)
    var quadSize =
      4 * sizeOfDouble + 3 * sizeOfInt32 + 4 * pointSize + 2 * faceSize;

    // QuadSize + size of each quad
    var totalSize = 4 * (quadSize + sizeOfUint32);
    var buf = new ArrayBuffer(totalSize);
    var dv = new DataView(buf);

    var altitudeStart = 0;
    var offset = 0;
    for (var i = 0; i < 4; ++i) {
      altitudeStart = 0;
      dv.setUint32(offset, quadSize, true);
      offset += sizeOfUint32;

      // Origin
      var xOrigin = southwest.longitude;
      var yOrigin = southwest.latitude;

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
      var j;
      for (j = 0; j < 4; ++j) {
        var xPos = 0;
        var yPos = 0;
        var altitude = altitudeStart;
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
      var indices = [0, 1, 2, 1, 3, 2];
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
      var maxShort = 32767;
      var tilingScheme = new GeographicTilingScheme();
      var buffer = getBuffer(tilingScheme, 0, 0, 0);
      var data = new GoogleEarthEnterpriseTerrainData({
        buffer: buffer,
        childTileMask: 15,
        negativeAltitudeExponentBias: 32,
        negativeElevationThreshold: CesiumMath.EPSILON12,
      });

      tilingScheme = new GeographicTilingScheme();
      var childRectangles = [
        tilingScheme.tileXYToRectangle(0, 0, 1),
        tilingScheme.tileXYToRectangle(1, 0, 1),
        tilingScheme.tileXYToRectangle(0, 1, 1),
        tilingScheme.tileXYToRectangle(1, 1, 1),
      ];

      return when(
        data.createMesh({
          tilingScheme: tilingScheme,
          x: 0,
          y: 0,
          level: 0,
        })
      )
        .then(function () {
          var swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
          var sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
          var nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
          var nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);
          return when.join(swPromise, sePromise, nwPromise, nePromise);
        })
        .then(function (upsampleResults) {
          expect(upsampleResults.length).toBe(4);

          for (var i = 0; i < upsampleResults.length; ++i) {
            var upsampled = upsampleResults[i];
            expect(upsampled).toBeDefined();

            var uBuffer = upsampled._uValues;
            var vBuffer = upsampled._vValues;
            var ib = upsampled._indices;
            var heights = upsampled._heightValues;

            expect(uBuffer.length).toBe(4);
            expect(vBuffer.length).toBe(4);
            expect(heights.length).toBe(4);
            expect(ib.length).toBe(6);

            var rectangle = childRectangles[i];
            var north = 0;
            var south = 0;
            var east = 0;
            var west = 0;
            var index, u, v;
            for (var j = 0; j < ib.length; ++j) {
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
    var data;
    var tilingScheme;
    var buffer;

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
      var rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);

      var wgs84 = Ellipsoid.WGS84;
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

          var encoding = mesh.encoding;
          var cartesian = new Cartesian3();
          var cartographic = new Cartographic();
          var count = mesh.vertices.length / mesh.encoding.stride;
          for (var i = 0; i < count; ++i) {
            var height = encoding.decodeHeight(mesh.vertices, i);
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

          var encoding = mesh.encoding;
          var count = mesh.vertices.length / mesh.encoding.stride;
          for (var i = 0; i < count; ++i) {
            var height = encoding.decodeHeight(mesh.vertices, i);
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
    var tilingScheme;
    var rectangle;
    var mesh;

    beforeEach(function () {
      tilingScheme = new GeographicTilingScheme();
      rectangle = tilingScheme.tileXYToRectangle(7, 6, 5);
      var buffer = getBuffer(tilingScheme, 7, 6, 5);
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
      var longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.25;
      var latitude =
        rectangle.south + (rectangle.north - rectangle.south) * 0.75;

      var result = mesh.interpolateHeight(rectangle, longitude, latitude);
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
    var data;

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
      var data = new GoogleEarthEnterpriseTerrainData({
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
      var data = new GoogleEarthEnterpriseTerrainData({
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
      var data = new GoogleEarthEnterpriseTerrainData({
        buffer: new ArrayBuffer(1),
        childTileMask: 8,
        negativeAltitudeExponentBias: 32,
      });
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });
});
