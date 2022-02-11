import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { QuantizedMeshTerrainData } from "../../Source/Cesium.js";
import { TerrainData } from "../../Source/Cesium.js";
import { TerrainMesh } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Core/QuantizedMeshTerrainData", function () {
  it("conforms to TerrainData interface", function () {
    expect(QuantizedMeshTerrainData).toConformToInterface(TerrainData);
  });

  describe("upsample", function () {
    function findVertexWithCoordinates(uBuffer, vBuffer, u, v) {
      u *= 32767;
      u |= 0;
      v *= 32767;
      v |= 0;
      for (let i = 0; i < uBuffer.length; ++i) {
        if (Math.abs(uBuffer[i] - u) <= 1 && Math.abs(vBuffer[i] - v) <= 1) {
          return i;
        }
      }
      return -1;
    }

    function hasTriangle(ib, i0, i1, i2) {
      for (let i = 0; i < ib.length; i += 3) {
        if (
          (ib[i] === i0 && ib[i + 1] === i1 && ib[i + 2] === i2) ||
          (ib[i] === i1 && ib[i + 1] === i2 && ib[i + 2] === i0) ||
          (ib[i] === i2 && ib[i + 1] === i0 && ib[i + 2] === i1)
        ) {
          return true;
        }
      }

      return false;
    }

    function intercept(
      interceptCoordinate1,
      interceptCoordinate2,
      otherCoordinate1,
      otherCoordinate2
    ) {
      return CesiumMath.lerp(
        otherCoordinate1,
        otherCoordinate2,
        (0.5 - interceptCoordinate1) /
          (interceptCoordinate2 - interceptCoordinate1)
      );
    }

    function horizontalIntercept(u1, v1, u2, v2) {
      return intercept(v1, v2, u1, u2);
    }

    function verticalIntercept(u1, v1, u2, v2) {
      return intercept(u1, u2, v1, v2);
    }

    it("works for all four children of a simple quad", function () {
      const data = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 4.0,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          32767 / 4.0,
          (2.0 * 32767) / 4.0,
          (3.0 * 32767) / 4.0,
          32767,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [],
        southIndices: [],
        eastIndices: [],
        northIndices: [],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      const tilingScheme = new GeographicTilingScheme();

      return when(
        data.createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
      )
        .then(function () {
          const swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
          const sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
          const nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
          const nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);
          return when.join(swPromise, sePromise, nwPromise, nePromise);
        })
        .then(function (upsampleResults) {
          expect(upsampleResults.length).toBe(4);

          for (let i = 0; i < upsampleResults.length; ++i) {
            const upsampled = upsampleResults[i];
            expect(upsampled).toBeDefined();

            const uBuffer = upsampled._uValues;
            const vBuffer = upsampled._vValues;
            const ib = upsampled._indices;

            expect(uBuffer.length).toBe(4);
            expect(vBuffer.length).toBe(4);
            expect(upsampled._heightValues.length).toBe(4);
            expect(ib.length).toBe(6);

            const sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
            expect(sw).not.toBe(-1);
            const nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
            expect(nw).not.toBe(-1);
            const se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
            expect(se).not.toBe(-1);
            const ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
            expect(ne).not.toBe(-1);

            const nwToSe =
              hasTriangle(ib, sw, se, nw) && hasTriangle(ib, nw, se, ne);
            const swToNe =
              hasTriangle(ib, sw, ne, nw) && hasTriangle(ib, sw, se, ne);
            expect(nwToSe || swToNe).toBe(true);
          }
        });
    });

    it("oct-encoded normals works for all four children of a simple quad", function () {
      const data = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 4.0,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          32767 / 4.0,
          (2.0 * 32767) / 4.0,
          (3.0 * 32767) / 4.0,
          32767,
        ]),
        encodedNormals: new Uint8Array([
          // fun property of oct-encoded normals: the octrahedron is projected onto a plane
          // and unfolded into a unit square.  The 4 corners of this unit square are encoded values
          // of the same Cartesian normal, vec3(0.0, 0.0, 1.0).
          // Therefore, all 4 normals below are actually oct-encoded representations of vec3(0.0, 0.0, 1.0)
          255,
          0, // sw
          255,
          255, // nw
          255,
          0, // se
          255,
          255, // ne
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [],
        southIndices: [],
        eastIndices: [],
        northIndices: [],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      const tilingScheme = new GeographicTilingScheme();

      return when(
        data.createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
      )
        .then(function () {
          const swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
          const sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
          const nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
          const nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);
          return when.join(swPromise, sePromise, nwPromise, nePromise);
        })
        .then(function (upsampleResults) {
          expect(upsampleResults.length).toBe(4);

          for (let i = 0; i < upsampleResults.length; ++i) {
            const upsampled = upsampleResults[i];
            expect(upsampled).toBeDefined();

            const encodedNormals = upsampled._encodedNormals;

            expect(encodedNormals.length).toBe(8);

            // All 4 normals should remain oct-encoded representations of vec3(0.0, 0.0, -1.0)
            for (let n = 0; n < encodedNormals.length; ++n) {
              expect(encodedNormals[i]).toBe(255);
            }
          }
        });
    });

    it("works for a quad with an extra vertex in the northwest child", function () {
      const data = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 6.0,
        quantizedVertices: new Uint16Array([
          // order is sw, nw, se, ne, extra vertex in nw quadrant
          // u
          0,
          0,
          32767,
          32767,
          0.125 * 32767,
          // v
          0,
          32767,
          0,
          32767,
          0.75 * 32767,
          // heights
          32767 / 6.0,
          (2.0 * 32767) / 6.0,
          (3.0 * 32767) / 6.0,
          (4.0 * 32767) / 6.0,
          32767,
        ]),
        indices: new Uint16Array([0, 4, 1, 0, 2, 4, 1, 4, 3, 3, 4, 2]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [],
        southIndices: [],
        eastIndices: [],
        northIndices: [],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      const tilingScheme = new GeographicTilingScheme();
      return when(
        data.createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
      )
        .then(function () {
          return data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
        })
        .then(function (upsampled) {
          const uBuffer = upsampled._uValues;
          const vBuffer = upsampled._vValues;
          const ib = upsampled._indices;

          expect(uBuffer.length).toBe(9);
          expect(vBuffer.length).toBe(9);
          expect(upsampled._heightValues.length).toBe(9);
          expect(ib.length).toBe(8 * 3);

          const sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
          expect(sw).not.toBe(-1);
          const nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
          expect(nw).not.toBe(-1);
          const se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
          expect(se).not.toBe(-1);
          const ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
          expect(ne).not.toBe(-1);
          const extra = findVertexWithCoordinates(uBuffer, vBuffer, 0.25, 0.5);
          expect(extra).not.toBe(-1);
          const v40 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            horizontalIntercept(0.0, 0.0, 0.125, 0.75) * 2.0,
            0.0
          );
          expect(v40).not.toBe(-1);
          const v42 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            horizontalIntercept(
              0.5,
              verticalIntercept(1.0, 0.0, 0.125, 0.75),
              0.125,
              0.75
            ) * 2.0,
            0.0
          );
          expect(v42).not.toBe(-1);
          const v402 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            horizontalIntercept(0.5, 0.0, 0.125, 0.75) * 2.0,
            0.0
          );
          expect(v402).not.toBe(-1);
          const v43 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            1.0,
            verticalIntercept(1.0, 1.0, 0.125, 0.75) * 2.0 - 1.0
          );
          expect(v43).not.toBe(-1);

          expect(hasTriangle(ib, sw, extra, nw)).toBe(true);
          expect(hasTriangle(ib, sw, v40, extra)).toBe(true);
          expect(hasTriangle(ib, v40, v402, extra)).toBe(true);
          expect(hasTriangle(ib, v402, v42, extra)).toBe(true);
          expect(hasTriangle(ib, extra, v42, v43)).toBe(true);
          expect(hasTriangle(ib, v42, se, v43)).toBe(true);
          expect(hasTriangle(ib, nw, v43, ne)).toBe(true);
          expect(hasTriangle(ib, nw, extra, v43)).toBe(true);
        });
    });

    it("works for a quad with an extra vertex on the splitting plane", function () {
      const data = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 6.0,
        quantizedVertices: new Uint16Array([
          // order is sw, nw, se, ne, extra vertex in nw quadrant
          // u
          0,
          0,
          32767,
          32767,
          0.5 * 32767,
          // v
          0,
          32767,
          0,
          32767,
          0.75 * 32767,
          // heights
          32767 / 6.0,
          (2.0 * 32767) / 6.0,
          (3.0 * 32767) / 6.0,
          (4.0 * 32767) / 6.0,
          32767,
        ]),
        indices: new Uint16Array([0, 4, 1, 1, 4, 3, 0, 2, 4, 3, 4, 2]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [],
        southIndices: [],
        eastIndices: [],
        northIndices: [],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      const tilingScheme = new GeographicTilingScheme();
      return when(
        data.createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
      )
        .then(function () {
          const nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
          const nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
          return when.join(nwPromise, nePromise);
        })
        .then(function (upsampleResults) {
          expect(upsampleResults.length).toBe(2);
          let uBuffer, vBuffer;
          for (let i = 0; i < upsampleResults.length; i++) {
            const upsampled = upsampleResults[i];
            expect(upsampled).toBeDefined();

            uBuffer = upsampled._uValues;
            vBuffer = upsampled._vValues;
            const ib = upsampled._indices;

            expect(uBuffer.length).toBe(6);
            expect(vBuffer.length).toBe(6);
            expect(upsampled._heightValues.length).toBe(6);
            expect(ib.length).toBe(4 * 3);

            const sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
            expect(sw).not.toBe(-1);
            const nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
            expect(nw).not.toBe(-1);
            const se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
            expect(se).not.toBe(-1);
            const ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
            expect(ne).not.toBe(-1);
          }

          // northwest
          uBuffer = upsampleResults[0]._uValues;
          vBuffer = upsampleResults[0]._vValues;
          let extra = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.5);
          expect(extra).not.toBe(-1);
          const v40 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            horizontalIntercept(0.0, 0.0, 0.5, 0.75) * 2.0,
            0.0
          );
          expect(v40).not.toBe(-1);
          expect(upsampleResults[0]._westIndices.length).toBe(2);
          expect(upsampleResults[0]._eastIndices.length).toBe(3);
          expect(upsampleResults[0]._northIndices.length).toBe(2);
          expect(upsampleResults[0]._southIndices.length).toBe(3);

          // northeast
          uBuffer = upsampleResults[1]._uValues;
          vBuffer = upsampleResults[1]._vValues;
          extra = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.5);
          expect(extra).not.toBe(-1);
          const v42 = findVertexWithCoordinates(
            uBuffer,
            vBuffer,
            horizontalIntercept(1.0, 0.0, 0.5, 0.75) * 0.5,
            0.0
          );
          expect(v42).not.toBe(-1);
          expect(upsampleResults[1]._westIndices.length).toBe(3);
          expect(upsampleResults[1]._eastIndices.length).toBe(2);
          expect(upsampleResults[1]._northIndices.length).toBe(2);
          expect(upsampleResults[1]._southIndices.length).toBe(3);
        });
    });
  });

  describe("createMesh", function () {
    let data;
    let tilingScheme;

    function createSampleTerrainData() {
      return new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 4.0,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          32767 / 4.0,
          (2.0 * 32767) / 4.0,
          (3.0 * 32767) / 4.0,
          32767,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });
    }
    beforeEach(function () {
      tilingScheme = new GeographicTilingScheme();
      data = createSampleTerrainData();
    });

    it("requires tilingScheme", function () {
      expect(function () {
        data.createMesh({ tilingScheme: undefined, x: 0, y: 0, level: 0 });
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
      return data
        .createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
        .then(function (mesh) {
          expect(mesh).toBeInstanceOf(TerrainMesh);
          expect(mesh.vertices.length).toBe(12 * mesh.encoding.stride); // 4 regular vertices, 8 skirt vertices.
          expect(mesh.indices.length).toBe(10 * 3); // 2 regular triangles, 8 skirt triangles.
          expect(mesh.minimumHeight).toBe(data._minimumHeight);
          expect(mesh.maximumHeight).toBe(data._maximumHeight);
          expect(mesh.boundingSphere3D).toEqual(data._boundingSphere);
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
          expect(mesh.vertices.length).toBe(12 * mesh.encoding.stride); // 4 regular vertices, 8 skirt vertices.
          expect(mesh.indices.length).toBe(10 * 3); // 2 regular triangles, 8 skirt triangles.

          // Even though there's exaggeration, it doesn't affect the mesh's
          // height, bounding sphere, or any other bounding volumes.
          // The exaggeration is instead stored in the mesh's TerrainEncoding
          expect(mesh.minimumHeight).toBe(data._minimumHeight);
          expect(mesh.maximumHeight).toBe(data._maximumHeight);
          expect(mesh.boundingSphere3D.radius).toBe(
            data._boundingSphere.radius
          );
          expect(mesh.encoding.exaggeration).toBe(2.0);
        });
    });

    it("requires 32bit indices for large meshes", function () {
      const tilingScheme = new GeographicTilingScheme();
      const quantizedVertices = [];
      let i;
      for (i = 0; i < 65 * 1024; i++) {
        quantizedVertices.push(i % 32767); // u
      }
      for (i = 0; i < 65 * 1024; i++) {
        quantizedVertices.push(Math.floor(i / 32767)); // v
      }
      for (i = 0; i < 65 * 1024; i++) {
        quantizedVertices.push(0.0); // height
      }
      const data = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 4.0,
        quantizedVertices: new Uint16Array(quantizedVertices),
        indices: new Uint32Array([0, 3, 1, 0, 2, 3, 65000, 65002, 65003]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      return data
        .createMesh({ tilingScheme: tilingScheme, x: 0, y: 0, level: 0 })
        .then(function (mesh) {
          expect(mesh).toBeInstanceOf(TerrainMesh);
          expect(mesh.indices.BYTES_PER_ELEMENT).toBe(4);
        });
    });

    it("enables throttling for asynchronous tasks", function () {
      const options = {
        tilingScheme: tilingScheme,
        x: 0,
        y: 0,
        level: 0,
        throttle: true,
      };
      const taskCount = TerrainData.maximumAsynchronousTasks + 1;
      const promises = new Array();
      for (let i = 0; i < taskCount; i++) {
        const tempData = createSampleTerrainData();
        const promise = tempData.createMesh(options);
        if (defined(promise)) {
          promises.push(promise);
        }
      }
      expect(promises.length).toBe(TerrainData.maximumAsynchronousTasks);
      return when.all(promises);
    });

    it("disables throttling for asynchronous tasks", function () {
      const options = {
        tilingScheme: tilingScheme,
        x: 0,
        y: 0,
        level: 0,
        throttle: false,
      };
      const taskCount = TerrainData.maximumAsynchronousTasks + 1;
      const promises = new Array();
      for (let i = 0; i < taskCount; i++) {
        const tempData = createSampleTerrainData();
        const promise = tempData.createMesh(options);
        if (defined(promise)) {
          promises.push(promise);
        }
      }
      expect(promises.length).toBe(taskCount);
      return when.all(promises);
    });
  });

  describe("interpolateHeight", function () {
    let tilingScheme;
    let rectangle;

    beforeEach(function () {
      tilingScheme = new GeographicTilingScheme();
      rectangle = tilingScheme.tileXYToRectangle(7, 6, 5);
    });

    it("clamps coordinates if given a position outside the mesh", function () {
      const mesh = new QuantizedMeshTerrainData({
        minimumHeight: 0.0,
        maximumHeight: 4.0,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          32767 / 4.0,
          (2.0 * 32767) / 4.0,
          (3.0 * 32767) / 4.0,
          32767,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      expect(mesh.interpolateHeight(rectangle, 0.0, 0.0)).toBe(
        mesh.interpolateHeight(rectangle, rectangle.east, rectangle.south)
      );
    });

    it("returns a height interpolated from the correct triangle", function () {
      // zero height along line between southwest and northeast corners.
      // Negative height in the northwest corner, positive height in the southeast.
      const mesh = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
      });

      // position in the northwest quadrant of the tile.
      let longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.25;
      let latitude =
        rectangle.south + (rectangle.north - rectangle.south) * 0.75;

      let result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toBeLessThan(0.0);

      // position in the southeast quadrant of the tile.
      longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.75;
      latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.25;

      result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toBeGreaterThan(0.0);

      // position on the line between the southwest and northeast corners.
      longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.5;
      latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.5;

      result = mesh.interpolateHeight(rectangle, longitude, latitude);
      expect(result).toEqualEpsilon(0.0, 1e-10);
    });
  });

  describe("isChildAvailable", function () {
    let data;

    beforeEach(function () {
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 15,
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
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
    });

    it("works when only southwest child is available", function () {
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 1,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });

    it("works when only southeast child is available", function () {
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 2,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
    });

    it("works when only northwest child is available", function () {
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 4,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });

    it("works when only northeast child is available", function () {
      data = new QuantizedMeshTerrainData({
        minimumHeight: -16384,
        maximumHeight: 16383,
        quantizedVertices: new Uint16Array([
          // order is sw nw se ne
          // u
          0,
          0,
          32767,
          32767,
          // v
          0,
          32767,
          0,
          32767,
          // heights
          16384,
          0,
          32767,
          16384,
        ]),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        boundingSphere: new BoundingSphere(),
        horizonOcclusionPoint: new Cartesian3(),
        westIndices: [0, 1],
        southIndices: [0, 1],
        eastIndices: [2, 3],
        northIndices: [1, 3],
        westSkirtHeight: 1.0,
        southSkirtHeight: 1.0,
        eastSkirtHeight: 1.0,
        northSkirtHeight: 1.0,
        childTileMask: 8,
      });

      expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
      expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
      expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
    });
  });
});
