import {
  ComponentDatatype,
  DracoLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  Resource,
  ResourceCache,
  ResourceLoaderState,
  when,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe("Scene/GltfDracoLoader", function () {
  var bufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  var bufferArrayBuffer = bufferTypedArray.buffer;

  var decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
  var decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
  var decodedIndices = new Uint16Array([0, 1, 2]);

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

  it("rejects promise if buffer view fails to load", function () {
    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    dracoLoader.load();

    return dracoLoader.promise
      .then(function (dracoLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load Draco\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("rejects promise if draco decoding fails", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    var error = new Error("Draco decode failed");
    spyOn(DracoLoader, "decodeBufferView").and.returnValue(when.reject(error));

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    dracoLoader.load();

    return waitForLoaderProcess(dracoLoader, scene)
      .then(function (dracoLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load Draco\nDraco decode failed"
        );
      });
  });

  it("loads draco", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    // Simulate decodeBufferView not being ready for a few frames
    // Then simulate the promise not resolving for another few frames
    var deferredPromise = when.defer();
    var decodeBufferViewCallsTotal = 3;
    var decodeBufferViewCallsCount = 0;
    var processCallsTotal = 6;
    var processCallsCount = 0;
    spyOn(DracoLoader, "decodeBufferView").and.callFake(function () {
      if (decodeBufferViewCallsCount++ === decodeBufferViewCallsTotal) {
        return deferredPromise.promise;
      }
      return undefined;
    });

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    dracoLoader.load();

    return pollToPromise(function () {
      dracoLoader.process(scene.frameState);
      if (processCallsCount++ === processCallsTotal) {
        deferredPromise.resolve(decodeDracoResults);
      }
      return (
        dracoLoader._state === ResourceLoaderState.READY ||
        dracoLoader._state === ResourceLoaderState.FAILED
      );
    }).then(function () {
      return dracoLoader.promise.then(function (dracoLoader) {
        dracoLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(dracoLoader.decodedData.indices).toBe(
          decodeDracoResults.indexArray
        );
        expect(dracoLoader.decodedData.vertexAttributes).toBe(
          decodeDracoResults.attributeData
        );
      });
    });
  });

  it("destroys draco loader", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    spyOn(DracoLoader, "decodeBufferView").and.returnValue(
      when.resolve(decodeDracoResults)
    );

    var unloadBufferView = spyOn(
      GltfBufferViewLoader.prototype,
      "unload"
    ).and.callThrough();

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    dracoLoader.load();

    return waitForLoaderProcess(dracoLoader, scene).then(function (
      dracoLoader
    ) {
      expect(dracoLoader.decodedData).toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(false);

      dracoLoader.destroy();

      expect(dracoLoader.decodedData).not.toBeDefined();
      expect(dracoLoader.isDestroyed()).toBe(true);
      expect(unloadBufferView).toHaveBeenCalled();
    });
  });

  function resolveBufferViewAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    spyOn(DracoLoader, "decodeBufferView").and.returnValue(
      when.resolve(decodeDracoResults)
    );

    // Load a copy of the buffer view into the cache so that the buffer view
    // promise resolves even if the draco loader is destroyed
    var bufferViewLoaderCopy = ResourceCache.loadBufferView({
      gltf: gltfDraco,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(dracoLoader.decodedData).not.toBeDefined();

    dracoLoader.load();
    dracoLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(bufferArrayBuffer);
    }

    expect(dracoLoader.decodedData).not.toBeDefined();
    expect(dracoLoader.isDestroyed()).toBe(true);

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
      when.resolve(bufferArrayBuffer)
    );

    var deferredPromise = when.defer();
    var decodeBufferView = spyOn(DracoLoader, "decodeBufferView").and.callFake(
      function () {
        return deferredPromise.promise;
      }
    );

    var dracoLoader = new GltfDracoLoader({
      resourceCache: ResourceCache,
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(dracoLoader.decodedData).not.toBeDefined();

    dracoLoader.load();
    dracoLoader.process(scene.frameState);
    expect(decodeBufferView).toHaveBeenCalled(); // Make sure the decode actually starts

    dracoLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(decodeDracoResults);
    }

    expect(dracoLoader.decodedData).not.toBeDefined();
    expect(dracoLoader.isDestroyed()).toBe(true);
  }

  it("handles resolving draco after destroy", function () {
    resolveDracoAfterDestroy(false);
  });

  it("handles rejecting draco after destroy", function () {
    resolveDracoAfterDestroy(true);
  });
});
