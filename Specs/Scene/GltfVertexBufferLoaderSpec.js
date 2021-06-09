import {
  Buffer,
  Cartesian3,
  ComponentDatatype,
  DracoLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  GltfVertexBufferLoader,
  JobScheduler,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";
import concatTypedArrays from "../concatTypedArrays.js";
import createScene from "../createScene.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfVertexBufferLoader",
  function () {
    var dracoBufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
    var dracoArrayBuffer = dracoBufferTypedArray.buffer;

    var decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
    var decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
    var decodedIndices = new Uint16Array([0, 1, 2]);

    var positions = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0]); // prettier-ignore
    var normals = new Float32Array([-1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]); // prettier-ignore
    var indices = new Uint16Array([0, 1, 2]);

    var bufferViewTypedArray = concatTypedArrays([positions, normals, indices]);
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
          byteLength: 6,
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
          componentType: 5123,
          count: 3,
          type: "SCALAR",
          bufferView: 2,
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
        return new GltfVertexBufferLoader({
          resourceCache: undefined,
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          gltfResource: undefined,
          baseResource: gltfResource,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: undefined,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if bufferViewId and draco are both defined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
          draco: dracoExtension,
          dracoAttributeSemantic: "POSITION",
          dracoAccessorId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if bufferViewId and draco are both undefined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if draco is defined and dracoAttributeSemantic is not defined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          dracoAttributeSemantic: undefined,
          dracoAccessorId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if draco is defined and dracoAccessorId is not defined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          dracoAttributeSemantic: "POSITION",
          dracoAccessorId: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.reject(error)
      );

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
      });

      vertexBufferLoader.load();

      return vertexBufferLoader.promise
        .then(function (vertexBufferLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load vertex buffer\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
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

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        dracoAttributeSemantic: "POSITION",
        dracoAccessorId: 0,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene)
        .then(function (vertexBufferLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load vertex buffer\nFailed to load Draco\nDraco decode failed"
          );
        });
    });

    it("loads from buffer view", function () {
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

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        vertexBufferLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(vertexBufferLoader.vertexBuffer.sizeInBytes).toBe(
          positions.byteLength
        );
      });
    });

    it("creates vertex buffer synchronously", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        asynchronous: false,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.vertexBuffer.sizeInBytes).toBe(
          positions.byteLength
        );
      });
    });

    it("loads positions from draco", function () {
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

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        dracoAttributeSemantic: "POSITION",
        dracoAccessorId: 0,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        vertexBufferLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(vertexBufferLoader.vertexBuffer.sizeInBytes).toBe(
          decodedPositions.byteLength
        );

        var quantization = vertexBufferLoader.quantization;
        expect(quantization.octEncoded).toBe(false);
        expect(quantization.quantizedVolumeOffset).toEqual(
          new Cartesian3(-1.0, -1.0, -1.0)
        );
        expect(quantization.quantizedVolumeDimensions).toEqual(
          new Cartesian3(2.0, 2.0, 2.0)
        );
        expect(quantization.normalizationRange).toBe(16383);
        expect(quantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
      });
    });

    it("loads normals from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        return when.resolve(decodeDracoResults);
      });

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        dracoAttributeSemantic: "NORMAL",
        dracoAccessorId: 1,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.vertexBuffer.sizeInBytes).toBe(
          decodedNormals.byteLength
        );

        var quantization = vertexBufferLoader.quantization;
        expect(quantization.octEncoded).toBe(true);
        expect(quantization.quantizedVolumeOffset).toBeUndefined();
        expect(quantization.quantizedVolumeDimensions).toBeUndefined();
        expect(quantization.normalizationRange).toBe(1023);
        expect(quantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_BYTE
        );
      });
    });

    it("destroys vertex buffer loaded from buffer view", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(arrayBuffer)
      );

      var unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      var destroyVertexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.vertexBuffer).toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(false);

        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadBufferView).toHaveBeenCalled();
        expect(destroyVertexBuffer).toHaveBeenCalled();
      });
    });

    it("destroys vertex buffer loaded from draco", function () {
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

      var destroyVertexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        dracoAttributeSemantic: "POSITION",
        dracoAccessorId: 0,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.vertexBuffer).toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(false);

        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadDraco).toHaveBeenCalled();
        expect(destroyVertexBuffer).toHaveBeenCalled();
      });
    });

    function resolveBufferViewAfterDestroy(reject) {
      var deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        deferredPromise.promise
      );

      // Load a copy of the buffer view into the cache so that the buffer view
      // promise resolves even if the vertex buffer loader is destroyed
      var bufferViewLoaderCopy = ResourceCache.loadBufferView({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
      });

      expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();

      vertexBufferLoader.load();
      vertexBufferLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(arrayBuffer);
      }

      expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();
      expect(vertexBufferLoader.isDestroyed()).toBe(true);

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
      // promise resolves even if the vertex buffer loader is destroyed
      var dracoLoaderCopy = ResourceCache.loadDraco({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      var vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        dracoAttributeSemantic: "POSITION",
        dracoAccessorId: 0,
      });

      expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();

      vertexBufferLoader.load();
      vertexBufferLoader.process(scene.frameState);
      expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

      vertexBufferLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(decodeDracoResults);
      }

      expect(vertexBufferLoader.vertexBuffer).not.toBeDefined();
      expect(vertexBufferLoader.isDestroyed()).toBe(true);

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
