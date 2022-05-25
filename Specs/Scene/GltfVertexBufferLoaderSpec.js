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
} from "../../Source/Cesium.js";
import concatTypedArrays from "../concatTypedArrays.js";
import createScene from "../createScene.js";
import loaderProcess from "../loaderProcess.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfVertexBufferLoader",
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
    const indices = new Uint16Array([0, 1, 2]);

    const bufferViewTypedArray = concatTypedArrays([
      positions,
      normals,
      indices,
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
        return new GltfVertexBufferLoader({
          resourceCache: undefined,
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
          loadBuffer: true,
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
          loadBuffer: true,
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
          loadBuffer: true,
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
          loadBuffer: true,
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
          attributeSemantic: "POSITION",
          accessorId: 0,
          loadBuffer: true,
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
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if draco is defined and attributeSemantic is not defined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          attributeSemantic: undefined,
          accessorId: 0,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if draco is defined and accessorId is not defined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          attributeSemantic: "POSITION",
          accessorId: undefined,
          loadBuffer: true,
        });
      }).toThrowDeveloperError();
    });

    it("throws if both loadBuffer and loadTypedArray are false", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          resourceCache: ResourceCache,
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: undefined,
          bufferViewId: 0,
          loadBuffer: false,
          loadTypedArray: false,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      const error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.reject(error)
      );

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return vertexBufferLoader.promise
        .then(function (vertexBufferLoader) {
          fail();
        })
        .catch(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load vertex buffer\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
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

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene)
        .then(function (vertexBufferLoader) {
          fail();
        })
        .catch(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load vertex buffer\nFailed to load Draco\nDraco decode failed"
          );
        });
    });

    it("loads as buffer", function () {
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

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        loaderProcess(vertexBufferLoader, scene); // Check that calling process after load doesn't break anything
        expect(vertexBufferLoader.buffer.sizeInBytes).toBe(
          positions.byteLength
        );
        expect(vertexBufferLoader.typedArray).toBeUndefined();
      });
    });

    it("loads as typed array", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      spyOn(Buffer, "createVertexBuffer").and.callThrough();

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
        loadTypedArray: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.typedArray.byteLength).toBe(
          positions.byteLength
        );
        expect(vertexBufferLoader.buffer).toBeUndefined();
        expect(Buffer.createVertexBuffer.calls.count()).toBe(0);
      });
    });

    it("loads as both buffer and typed array", function () {
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

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
        loadBuffer: true,
        loadTypedArray: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        loaderProcess(vertexBufferLoader, scene); // Check that calling process after load doesn't break anything
        expect(vertexBufferLoader.buffer.sizeInBytes).toBe(
          positions.byteLength
        );
        expect(vertexBufferLoader.typedArray.byteLength).toBe(
          positions.byteLength
        );
      });
    });

    it("creates vertex buffer synchronously", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        asynchronous: false,
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer.sizeInBytes).toBe(
          positions.byteLength
        );
        expect(vertexBufferLoader.typedArray).toBeUndefined();
      });
    });

    it("loads positions from draco", function () {
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

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        loaderProcess(vertexBufferLoader, scene); // Check that calling process after load doesn't break anything
        expect(vertexBufferLoader.buffer.sizeInBytes).toBe(
          decodedPositions.byteLength
        );
        expect(vertexBufferLoader.typedArray).toBeUndefined();
        const quantization = vertexBufferLoader.quantization;
        expect(quantization.octEncoded).toBe(false);
        expect(quantization.quantizedVolumeOffset).toEqual(
          new Cartesian3(-1.0, -1.0, -1.0)
        );
        expect(quantization.quantizedVolumeDimensions).toEqual(
          new Cartesian3(2.0, 2.0, 2.0)
        );
        expect(quantization.normalizationRange).toEqual(
          new Cartesian3(16383, 16383, 16383)
        );
        expect(quantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
      });
    });

    it("loads normals from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        return Promise.resolve(decodeDracoResults);
      });

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "NORMAL",
        accessorId: 1,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer.sizeInBytes).toBe(
          decodedNormals.byteLength
        );

        const quantization = vertexBufferLoader.quantization;
        expect(quantization.octEncoded).toBe(true);
        expect(quantization.octEncodedZXY).toBe(true);
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
        Promise.resolve(arrayBuffer)
      );

      const unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      const destroyVertexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer).toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(false);

        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.buffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadBufferView).toHaveBeenCalled();
        expect(destroyVertexBuffer).toHaveBeenCalled();
      });
    });

    it("destroys vertex buffer loaded from draco", function () {
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

      const destroyVertexBuffer = spyOn(
        Buffer.prototype,
        "destroy"
      ).and.callThrough();

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      });

      vertexBufferLoader.load();

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer).toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(false);

        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.buffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);
        expect(unloadDraco).toHaveBeenCalled();
        expect(destroyVertexBuffer).toHaveBeenCalled();
      });
    });

    function resolveBufferViewAfterDestroy(rejectPromise) {
      let promise = new Promise(function (resolve, reject) {
        if (rejectPromise) {
          reject(new Error());
        } else {
          resolve(arrayBuffer);
        }
      });
      if (rejectPromise) {
        promise = promise.catch(function (e) {
          // swallow that error we just threw
        });
      }

      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(promise);

      // Load a copy of the buffer view into the cache so that the buffer view
      // promise resolves even if the vertex buffer loader is destroyed
      const bufferViewLoaderCopy = ResourceCache.loadBufferView({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        loadBuffer: true,
      });

      expect(vertexBufferLoader.buffer).not.toBeDefined();

      vertexBufferLoader.load();
      return promise.finally(function () {
        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.buffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);

        ResourceCache.unload(bufferViewLoaderCopy);
      });
    }

    it("handles resolving buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(false);
    });

    it("handles rejecting buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(true);
    });

    function resolveDracoAfterDestroy(rejectPromise) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const vertexBufferLoader = new GltfVertexBufferLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      });

      expect(vertexBufferLoader.buffer).not.toBeDefined();

      let promise = new Promise(function (resolve, reject) {
        setTimeout(function () {
          loaderProcess(vertexBufferLoader, scene);
          if (rejectPromise) {
            reject(new Error());
          } else {
            resolve(decodeDracoResults);
          }
        }, 1);
      });
      if (rejectPromise) {
        promise = promise.catch(function (e) {
          // swallow that error we just threw
        });
      }

      const decodeBufferView = spyOn(
        DracoLoader,
        "decodeBufferView"
      ).and.callFake(function () {
        return promise;
      });

      // Load a copy of the draco loader into the cache so that the draco loader
      // promise resolves even if the vertex buffer loader is destroyed
      const dracoLoaderCopy = ResourceCache.loadDraco({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      vertexBufferLoader.load();
      loaderProcess(vertexBufferLoader, scene);
      return promise.finally(function () {
        expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

        vertexBufferLoader.destroy();

        expect(vertexBufferLoader.buffer).not.toBeDefined();
        expect(vertexBufferLoader.isDestroyed()).toBe(true);

        ResourceCache.unload(dracoLoaderCopy);
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
