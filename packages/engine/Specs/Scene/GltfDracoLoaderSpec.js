import {
  ComponentDatatype,
  DracoLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  Resource,
  ResourceCache,
  RuntimeError,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import loaderProcess from "../../../../Specs/loaderProcess.js";
import waitForLoaderProcess from "../../../../Specs/waitForLoaderProcess.js";

describe(
  "Scene/GltfDracoLoader",
  function () {
    const bufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
    const bufferArrayBuffer = bufferTypedArray.buffer;

    const decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
    const decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
    const decodedIndices = new Uint16Array([0, 1, 2]);

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
        return new GltfDracoLoader({
          resourceCache: undefined,
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfDracoLoader({
          resourceCache: ResourceCache,
          gltf: undefined,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if draco is undefined", function () {
      expect(function () {
        return new GltfDracoLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          draco: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfDracoLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfDracoLoader({
          resourceCache: ResourceCache,
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("load throws if buffer view fails to load", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        const error = new Error("404 Not Found");
        return Promise.reject(error);
      });

      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await expectAsync(dracoLoader.load()).toBeRejectedWithError(
        RuntimeError,
        "Failed to load Draco\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
      );
    });

    it("process throws if draco decoding fails", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        const error = new Error("Draco decode failed");
        return Promise.reject(error);
      });

      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await dracoLoader.load();

      await expectAsync(
        waitForLoaderProcess(dracoLoader, scene)
      ).toBeRejectedWithError(
        RuntimeError,
        "Failed to load Draco\nDraco decode failed"
      );
      expect(() => loaderProcess(dracoLoader, scene)).not.toThrowError();
    });

    it("loads draco", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      // Simulate decodeBufferView not being ready for a few frames
      const decodeBufferViewCallsTotal = 3;
      let decodeBufferViewCallsCount = 0;
      spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
        if (decodeBufferViewCallsCount++ === decodeBufferViewCallsTotal) {
          return Promise.resolve(decodeDracoResults);
        }
        return undefined;
      });

      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await dracoLoader.load();
      await waitForLoaderProcess(dracoLoader, scene);

      expect(() => loaderProcess(dracoLoader, scene)).not.toThrowError();
      expect(dracoLoader.decodedData.indices).toBe(
        decodeDracoResults.indexArray
      );
      expect(dracoLoader.decodedData.vertexAttributes).toBe(
        decodeDracoResults.attributeData
      );
    });

    it("destroys draco loader", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await dracoLoader.load();
      await waitForLoaderProcess(dracoLoader, scene);

      expect(dracoLoader.decodedData).toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(false);

      dracoLoader.destroy();

      expect(dracoLoader.decodedData).not.toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(true);
      expect(unloadBufferView).toHaveBeenCalled();
    });

    async function resolveBufferViewAfterDestroy(reject) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        if (reject) {
          return Promise.reject(new Error());
        }

        return Promise.resolve(bufferArrayBuffer);
      });

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      expect(dracoLoader.decodedData).not.toBeDefined();

      const promise = dracoLoader.load();
      dracoLoader.destroy();

      await expectAsync(promise).toBeResolved();

      expect(dracoLoader.decodedData).not.toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(true);
    }

    it("handles resolving buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(false);
    });

    it("handles rejecting buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(true);
    });

    async function resolveDracoAfterDestroy(rejectPromise) {
      const dracoLoader = new GltfDracoLoader({
        resourceCache: ResourceCache,
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        // After we resolve, process again, then destroy
        setTimeout(function () {
          dracoLoader.destroy();
        }, 1);
        return Promise.resolve(bufferArrayBuffer);
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

      expect(dracoLoader.decodedData).not.toBeDefined();

      await dracoLoader.load();
      await waitForLoaderProcess(dracoLoader, scene); // Destroy happens in mock above
      expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

      expect(dracoLoader.decodedData).not.toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(true);
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
