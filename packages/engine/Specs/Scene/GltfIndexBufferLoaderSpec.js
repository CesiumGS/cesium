import {
  Buffer,
  clone,
  ComponentDatatype,
  DracoLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  GltfIndexBufferLoader,
  JobScheduler,
  Resource,
  ResourceCache,
} from "../../index.js";
import concatTypedArrays from "../concatTypedArrays.js";
import createScene from "../../../../Specs/createScene.js";;
import loaderProcess from "../loaderProcess.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfIndexBufferLoader",
  function () {
    const dracoBufferTypedArray = new Uint8Array([
      1,
      3,
      7,
      15,
      31,
      63,
      127,
      255,
    ]);
    const dracoArrayBuffer = dracoBufferTypedArray.buffer;

    const decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
    const decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
    const decodedIndices = new Uint16Array([0, 1, 2]);

    const positions = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0]); // prettier-ignore
    const normals = new Float32Array([-1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]); // prettier-ignore
    const indicesUint32 = new Uint32Array([0, 1, 2]);
    const indicesUint16 = new Uint16Array([0, 1, 2]);
    const indicesUint8 = new Uint8Array([0, 1, 2]);

    const bufferViewTypedArray = concatTypedArrays([
      positions,
      normals,
      indicesUint32,
      indicesUint16,
      indicesUint8,
    ]);
    const arrayBuffer = bufferViewTypedArray.buffer;

    const gltfUri = "https://example.com/model.glb";
    const gltfResource = new Resource({
      url: gltfUri,
    });

    const decodeDracoResults = {
      indexArray: {
        typedArray: decodedIndices,
        numberOfIndices: decodedIndices.length,
      },
      attributeData: {
        POSITION: {
          array: decodedPositions,
          data: {
            byteOffset: 0,
            byteStride: 6,
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            componentsPerAttribute: 3,
            normalized: false,
            quantization: {
              octEncoded: false,
              quantizationBits: 14,
              minValues: [-1.0, -1.0, -1.0],
              range: 2.0,
            },
          },
        },
        NORMAL: {
          array: decodedNormals,
          data: {
            byteOffset: 0,
            byteStride: 2,
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 2,
            normalized: false,
            quantization: {
              octEncoded: true,
              quantizationBits: 10,
            },
          },
        },
      },
    };

    const gltfDraco = {
      buffers: [
        {
          uri: "external.bin",
          byteLength: 8,
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 4,
          byteLength: 4,
        },
      ],
      accessors: [
        {
          componentType: 5126,
          count: 3,
          max: [-1.0, -1.0, -1.0],
          min: [1.0, 1.0, 1.0],
          type: "VEC3",
        },
        {
          componentType: 5126,
          count: 3,
          type: "VEC3",
        },
        {
          componentType: 5123,
          count: 3,
          type: "SCALAR",
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 2,
              extensions: {
                KHR_draco_mesh_compression: {
                  bufferView: 0,
                  attributes: {
                    POSITION: 0,
                    NORMAL: 1,
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const dracoExtension =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    const gltfUncompressed = {
      buffers: [
        {
          uri: "external.bin",
          byteLength: 78,
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 36,
        },
        {
          buffer: 0,
          byteOffset: 36,
          byteLength: 36,
        },
        {
          buffer: 0,
          byteOffset: 72,
          byteLength: 12,
        },
        {
          buffer: 0,
          byteOffset: 84,
          byteLength: 6,
        },
        {
          buffer: 0,
          byteOffset: 90,
          byteLength: 3,
        },
      ],
      accessors: [
        {
          componentType: 5126,
          count: 3,
          max: [-1.0, -1.0, -1.0],
          min: [1.0, 1.0, 1.0],
          type: "VEC3",
          bufferView: 0,
          byteOffset: 0,
        },
        {
          componentType: 5126,
          count: 3,
          type: "VEC3",
          bufferView: 1,
          byteOffset: 0,
        },
        {
          componentType: 5125, // UNSIGNED_INT
          count: 3,
          type: "SCALAR",
          bufferView: 2,
          byteOffset: 0,
        },
        {
          componentType: 5123, // UNSIGNED_SHORT
          count: 3,
          type: "SCALAR",
          bufferView: 3,
          byteOffset: 0,
        },
        {
          componentType: 5121, // UNSIGNED_BYTE
          count: 3,
          type: "SCALAR",
          bufferView: 4,
          byteOffset: 0,
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 2,
            },
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 3,
            },
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 4,
            },
          ],
        },
      ],
    };

    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      ResourceCache.clearForSpecs();
    });

    it("throws if resourceCache is undefined", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: undefined,
          gltf: gltfUncompressed,
          accessorId: 3,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: ResourceCache,
          gltf: undefined,
          accessorId: 3,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if accessorId is undefined", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          accessorId: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          accessorId: 3,
          gltfResource: undefined,
          baseResource: gltfResource,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          accessorId: 3,
          gltfResource: gltfResource,
          baseResource: undefined,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if both loadBuffer and loadTypedArray are false", function () {
      expect(function () {
        return new GltfIndexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          accessorId: 3,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          loadBuffer: false,
          loadTypedArray: false,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        const error = new Error("404 Not Found");
        return Promise.reject(error);
      });

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return indexBufferLoader.promise
        .then(function (indexBufferLoader) {
          fail();
        })
        .catch(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load index buffer\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
          );
        });
    });

    it("rejects promise if draco fails to load", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(dracoArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        const error = new Error("Draco decode failed");
        return Promise.reject(error);
      });

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene)
        .then(function (indexBufferLoader) {
          fail();
        })
        .catch(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load index buffer\nFailed to load Draco\nDraco decode failed"
          );
        });
    });

    it("loads from accessor into buffer", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      // Simulate JobScheduler not being ready for a few frames
      const processCallsTotal = 3;
      let processCallsCount = 0;
      const jobScheduler = scene.frameState.jobScheduler;
      const originalJobSchedulerExecute = jobScheduler.execute;
      spyOn(JobScheduler.prototype, "execute").and.callFake(function (
        job,
        jobType
      ) {
        if (processCallsCount++ >= processCallsTotal) {
          return originalJobSchedulerExecute.call(jobScheduler, job, jobType);
        }
        return false;
      });

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        loaderProcess(indexBufferLoader, scene); // Check that calling process after load doesn't break anything
        expect(indexBufferLoader.buffer.sizeInBytes).toBe(
          indicesUint16.byteLength
        );
        expect(indexBufferLoader.typedArray).toBeUndefined();
      });
    });

    it("loads from accessor as typed array", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      spyOn(Buffer, "createIndexBuffer").and.callThrough();

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadTypedArray: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.typedArray.byteLength).toBe(
          indicesUint16.byteLength
        );
        expect(indexBufferLoader.buffer).toBeUndefined();
        expect(Buffer.createIndexBuffer.calls.count()).toBe(0);
      });
    });

    it("loads from accessor as buffer and typed array", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
        loadTypedArray: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.buffer.sizeInBytes).toBe(
          indicesUint16.byteLength
        );
        expect(indexBufferLoader.typedArray.byteLength).toBe(
          indicesUint16.byteLength
        );
      });
    });

    it("creates index buffer synchronously", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        asynchronous: false,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.buffer.sizeInBytes).toBe(
          indicesUint16.byteLength
        );
      });
    });

    function loadIndices(accessorId, expectedByteLength) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.buffer.sizeInBytes).toBe(expectedByteLength);
      });
    }

    it("loads uint32 indices", function () {
      if (!scene.frameState.context.elementIndexUint) {
        return;
      }

      return loadIndices(2, indicesUint32.byteLength);
    });

    it("loads uint16 indices", function () {
      return loadIndices(3, indicesUint16.byteLength);
    });

    it("loads uint8 indices", function () {
      return loadIndices(4, indicesUint8.byteLength);
    });

    it("loads from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      // Simulate decodeBufferView not being ready for a few frames
      const processCallsTotal = 3;
      let processCallsCount = 0;
      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        if (processCallsCount++ === processCallsTotal) {
          return Promise.resolve(decodeDracoResults);
        }
        return undefined;
      });

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        loaderProcess(indexBufferLoader, scene); // Check that calling process after load doesn't break anything
        expect(indexBufferLoader.buffer.sizeInBytes).toBe(
          decodedIndices.byteLength
        );
      });
    });

    it("uses the decoded data's type instead of the accessor component type", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const clonedGltf = clone(gltfDraco, true);
      clonedGltf.accessors[2].componentType = 5125;

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: clonedGltf,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.indexDatatype).toBe(5123);
        expect(indexBufferLoader.buffer.indexDatatype).toBe(5123);
      });
    });

    it("destroys index buffer loaded from buffer view", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      const destroyIndexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.buffer).toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(false);

        indexBufferLoader.destroy();

        expect(indexBufferLoader.buffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadBufferView).toHaveBeenCalled();
        expect(destroyIndexBuffer).toHaveBeenCalled();
      });
    });

    it("destroys index buffer loaded from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const unloadDraco = spyOn(
        GltfDracoLoader.prototype,
        "unload"
      ).and.callThrough();

      const destroyIndexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        loadBuffer: true,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.buffer).toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(false);

        indexBufferLoader.destroy();

        expect(indexBufferLoader.buffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadDraco).toHaveBeenCalled();
        expect(destroyIndexBuffer).toHaveBeenCalled();
      });
    });

    function resolveBufferViewAfterDestroy(rejectPromise) {
      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadBuffer: true,
      });

      const promise = new Promise(function (resolve, reject) {
        if (rejectPromise) {
          reject(new Error());
        } else {
          resolve(arrayBuffer);
        }
      });
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(promise);

      expect(indexBufferLoader.buffer).not.toBeDefined();

      indexBufferLoader.load();
      indexBufferLoader.destroy();

      return indexBufferLoader.promise.then(function () {
        expect(indexBufferLoader.buffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
      });
    }

    it("handles resolving buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(false);
    });

    it("handles rejecting buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(true);
    });

    function resolveDracoAfterDestroy(rejectPromise) {
      const indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        loadBuffer: true,
      });

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        // After we resolve, process again, then destroy
        setTimeout(function () {
          loaderProcess(indexBufferLoader, scene);
          indexBufferLoader.destroy();
        }, 1);
        return Promise.resolve(arrayBuffer);
      });

      const decodeBufferView = spyOn(
        DracoLoader,
        "decodeBufferView"
      ).and.callFake(function () {
        return new Promise(function (resolve, reject) {
          if (rejectPromise) {
            reject(new Error("Draco decode failed"));
          } else {
            resolve(decodeDracoResults);
          }
        });
      });

      expect(indexBufferLoader.buffer).not.toBeDefined();

      indexBufferLoader.load();
      loaderProcess(indexBufferLoader, scene);
      return indexBufferLoader.promise.then(function () {
        expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

        expect(indexBufferLoader.buffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
      });
    }

    it("handles resolving draco after destroy", function () {
      return resolveDracoAfterDestroy(false);
    });

    it("handles rejecting draco after destroy", function () {
      return resolveDracoAfterDestroy(true);
    });
  },
  "WebGL"
);
