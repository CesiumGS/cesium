import {
  Buffer,
  ComponentDatatype,
  DracoLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  GltfIndexBufferLoader,
  JobScheduler,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";
import concatTypedArrays from "../concatTypedArrays.js";
import createScene from "../createScene.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfIndexBufferLoader",
  function () {
    var dracoBufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
    var dracoArrayBuffer = dracoBufferTypedArray.buffer;

    var decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
    var decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
    var decodedIndices = new Uint16Array([0, 1, 2]);

    var positions = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0]); // prettier-ignore
    var normals = new Float32Array([-1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]); // prettier-ignore
    var indicesUint32 = new Uint32Array([0, 1, 2]);
    var indicesUint16 = new Uint16Array([0, 1, 2]);
    var indicesUint8 = new Uint8Array([0, 1, 2]);

    var bufferViewTypedArray = concatTypedArrays([
      positions,
      normals,
      indicesUint32,
      indicesUint16,
      indicesUint8,
    ]);
    var arrayBuffer = bufferViewTypedArray.buffer;

    var gltfUri = "https://example.com/model.glb";
    var gltfResource = new Resource({
      url: gltfUri,
    });

    var decodeDracoResults = {
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

    var gltfDraco = {
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

    var dracoExtension =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    var gltfUncompressed = {
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

    var scene;

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
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.reject(error)
      );

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      indexBufferLoader.load();

      return indexBufferLoader.promise
        .then(function (indexBufferLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load index buffer\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
          );
        });
    });

    it("rejects promise if draco fails to load", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(dracoArrayBuffer)
      );

      var error = new Error("Draco decode failed");
      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        when.reject(error)
      );

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene)
        .then(function (indexBufferLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load index buffer\nFailed to load Draco\nDraco decode failed"
          );
        });
    });

    it("loads from accessor", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      // Simulate JobScheduler not being ready for a few frames
      var processCallsTotal = 3;
      var processCallsCount = 0;
      var jobScheduler = scene.frameState.jobScheduler;
      var originalJobSchedulerExecute = jobScheduler.execute;
      spyOn(JobScheduler.prototype, "execute").and.callFake(function (
        job,
        jobType
      ) {
        if (processCallsCount++ >= processCallsTotal) {
          return originalJobSchedulerExecute.call(jobScheduler, job, jobType);
        }
        return false;
      });

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        indexBufferLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(indexBufferLoader.indexBuffer.sizeInBytes).toBe(
          indicesUint16.byteLength
        );
      });
    });

    it("creates index buffer synchronously", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        asynchronous: false,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.indexBuffer.sizeInBytes).toBe(
          indicesUint16.byteLength
        );
      });
    });

    function loadIndices(accessorId, expectedByteLength) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.indexBuffer.sizeInBytes).toBe(
          expectedByteLength
        );
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
        when.resolve(arrayBuffer)
      );

      // Simulate decodeBufferView not being ready for a few frames
      var processCallsTotal = 3;
      var processCallsCount = 0;
      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        if (processCallsCount++ === processCallsTotal) {
          return when.resolve(decodeDracoResults);
        }
        return undefined;
      });

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        indexBufferLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(indexBufferLoader.indexBuffer.sizeInBytes).toBe(
          decodedIndices.byteLength
        );
      });
    });

    it("destroys index buffer loaded from buffer view", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      var destroyIndexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.indexBuffer).toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(false);

        indexBufferLoader.destroy();

        expect(indexBufferLoader.indexBuffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadBufferView).toHaveBeenCalled();
        expect(destroyIndexBuffer).toHaveBeenCalled();
      });
    });

    it("destroys index buffer loaded from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        when.resolve(decodeDracoResults)
      );

      var unloadDraco = spyOn(
        GltfDracoLoader.prototype,
        "unload"
      ).and.callThrough();

      var destroyIndexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });

      indexBufferLoader.load();

      return waitForLoaderProcess(indexBufferLoader, scene).then(function (
        indexBufferLoader
      ) {
        expect(indexBufferLoader.indexBuffer).toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(false);

        indexBufferLoader.destroy();

        expect(indexBufferLoader.indexBuffer).not.toBeDefined();
        expect(indexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadDraco).toHaveBeenCalled();
        expect(destroyIndexBuffer).toHaveBeenCalled();
      });
    });

    function resolveBufferViewAfterDestroy(reject) {
      var deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        deferredPromise.promise
      );

      // Load a copy of the buffer view into the cache so that the buffer view
      // promise resolves even if the index buffer loader is destroyed
      var bufferViewLoaderCopy = ResourceCache.loadBufferView({
        gltf: gltfUncompressed,
        bufferViewId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        accessorId: 3,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      expect(indexBufferLoader.indexBuffer).not.toBeDefined();

      indexBufferLoader.load();
      indexBufferLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(arrayBuffer);
      }

      expect(indexBufferLoader.indexBuffer).not.toBeDefined();
      expect(indexBufferLoader.isDestroyed()).toBe(true);

      ResourceCache.unload(bufferViewLoaderCopy);
    }

    it("handles resolving buffer view after destroy", function () {
      resolveBufferViewAfterDestroy(false);
    });

    it("handles rejecting buffer view after destroy", function () {
      resolveBufferViewAfterDestroy(true);
    });

    function resolveDracoAfterDestroy(reject) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var deferredPromise = when.defer();
      var decodeBufferView = spyOn(
        DracoLoader,
        "decodeBufferView"
      ).and.callFake(function () {
        return deferredPromise.promise;
      });

      // Load a copy of the draco loader into the cache so that the draco loader
      // promise resolves even if the index buffer loader is destroyed
      var dracoLoaderCopy = ResourceCache.loadDraco({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      var indexBufferLoader = new GltfIndexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });

      expect(indexBufferLoader.indexBuffer).not.toBeDefined();

      indexBufferLoader.load();
      indexBufferLoader.process(scene.frameState);
      expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

      indexBufferLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(decodeDracoResults);
      }

      expect(indexBufferLoader.indexBuffer).not.toBeDefined();
      expect(indexBufferLoader.isDestroyed()).toBe(true);

      ResourceCache.unload(dracoLoaderCopy);
    }

    it("handles resolving draco after destroy", function () {
      resolveDracoAfterDestroy(false);
    });

    it("handles rejecting draco after destroy", function () {
      resolveDracoAfterDestroy(true);
    });
  },
  "WebGL"
);
