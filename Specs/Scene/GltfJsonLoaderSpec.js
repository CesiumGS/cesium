import {
  BufferLoader,
  clone,
  GltfJsonLoader,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";
import generateJsonBuffer from "../generateJsonBuffer.js";

describe("Scene/GltfJsonLoader", function () {
  var gltfUri = "https://example.com/model.glb";
  var gltfResource = new Resource({
    url: gltfUri,
  });
  var bufferResource = new Resource({
    url: "https://example.com/external.bin",
  });

  var gltf1 = {
    asset: {
      version: "1.0",
    },
    buffers: {
      buffer: {
        uri: "external.bin",
      },
    },
    bufferViews: {
      bufferView: {
        buffer: "buffer",
        byteOffset: 0,
      },
    },
    accessors: {
      accessor: {
        bufferView: "bufferView",
        byteOffset: 0,
        componentType: 5126,
        type: "VEC3",
        count: 1,
      },
    },
    meshes: {
      mesh: {
        primitives: [
          {
            attributes: {
              POSITION: "accessor",
            },
          },
        ],
      },
    },
    nodes: {
      node: {
        meshes: ["mesh"],
      },
    },
    scene: "scene",
    scenes: {
      scene: {
        nodes: ["node"],
      },
    },
  };

  var gltf1Updated = {
    asset: {
      version: "2.0",
    },
    buffers: [
      {
        uri: "external.bin",
        name: "buffer",
        byteLength: 12,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        name: "bufferView",
        byteLength: 12,
        byteStride: 12,
        target: 34962,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        type: "VEC3",
        count: 1,
        name: "accessor",
        min: [0, 0, 0],
        max: [0, 0, 0],
        normalized: false,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
            },
            mode: 4,
            material: 0,
          },
        ],
        name: "mesh",
      },
    ],
    nodes: [
      {
        name: "node",
        mesh: 0,
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
        name: "scene",
      },
    ],
    materials: [
      {
        name: "default",
        emissiveFactor: [0, 0, 0],
        alphaMode: "OPAQUE",
        doubleSided: false,
      },
    ],
  };

  var gltf2 = {
    asset: {
      version: "2.0",
    },
    buffers: [
      {
        uri: "external.bin",
        byteLength: 12,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 12,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        type: "VEC3",
        count: 1,
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
            },
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
  };

  var gltf2Updated = {
    asset: {
      version: "2.0",
    },
    buffers: [
      {
        uri: "external.bin",
        byteLength: 12,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 12,
        byteStride: 12,
        target: 34962,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        type: "VEC3",
        count: 1,
        min: [0, 0, 0],
        max: [0, 0, 0],
        normalized: false,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
            },
            mode: 4,
            material: 0,
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    materials: [
      {
        name: "default",
        emissiveFactor: [0, 0, 0],
        alphaMode: "OPAQUE",
        doubleSided: false,
      },
    ],
  };

  function createGlb1(json) {
    var jsonBuffer = generateJsonBuffer(json, 12, 4);
    var positionBuffer = new Float32Array([0.0, 0.0, 0.0]);
    var binaryBuffer = new Uint8Array(positionBuffer.buffer);
    var glbLength = 20 + jsonBuffer.byteLength + binaryBuffer.byteLength;
    var glb = new Uint8Array(glbLength);
    var dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);

    // Write binary glTF header (magic, version, length)
    var byteOffset = 0;
    dataView.setUint32(byteOffset, 0x46546c67, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, 1, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, glbLength, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, jsonBuffer.byteLength, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, 0, true);
    byteOffset += 4;

    // Write JSON Chunk
    glb.set(jsonBuffer, byteOffset);
    byteOffset += jsonBuffer.byteLength;

    // Write Binary Chunk
    glb.set(binaryBuffer, byteOffset);

    return glb;
  }

  function createGlb2(json) {
    var jsonBuffer = generateJsonBuffer(json, 12, 4);
    var positionBuffer = new Float32Array([0.0, 0.0, 0.0]);
    var binaryBuffer = new Uint8Array(positionBuffer.buffer);
    var glbLength =
      12 + 8 + jsonBuffer.byteLength + 8 + binaryBuffer.byteLength;
    var glb = new Uint8Array(glbLength);
    var dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);

    // Write binary glTF header (magic, version, length)
    var byteOffset = 0;
    dataView.setUint32(byteOffset, 0x46546c67, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, 2, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, glbLength, true);
    byteOffset += 4;

    // Write JSON Chunk header (length, type)
    dataView.setUint32(byteOffset, jsonBuffer.byteLength, true);
    byteOffset += 4;
    dataView.setUint32(byteOffset, 0x4e4f534a, true);
    byteOffset += 4;

    // Write JSON Chunk
    glb.set(jsonBuffer, byteOffset);
    byteOffset += jsonBuffer.byteLength;

    // Write Binary Chunk header (length, type)
    dataView.setUint32(byteOffset, binaryBuffer.byteLength);
    byteOffset += 4;
    dataView.setUint32(byteOffset, 0x004e4942, true);
    byteOffset += 4;

    // Write Binary Chunk
    glb.set(binaryBuffer, byteOffset);

    return glb;
  }

  afterEach(function () {
    ResourceCache.clearForSpecs();
  });

  it("throws if resourceCache is undefined", function () {
    expect(function () {
      return new GltfJsonLoader({
        resourceCache: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if gltfResource is undefined", function () {
    expect(function () {
      return new GltfJsonLoader({
        resourceCache: ResourceCache,
        gltfResource: undefined,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if baseResource is undefined", function () {
    expect(function () {
      return new GltfJsonLoader({
        resourceCache: ResourceCache,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if resource fails to load", function () {
    var error = new Error("404 Not Found");
    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.reject(error)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise
      .then(function (gltfJsonLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\n404 Not Found"
        );
      });
  });

  it("rejects promise if glTF fails to process", function () {
    var arrayBuffer = generateJsonBuffer(gltf1).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise
      .then(function (gltfJsonLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("rejects promise if glTF fails to process from typed array", function () {
    var typedArray = createGlb1(gltf1);

    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      typedArray: typedArray,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise
      .then(function (gltfJsonLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("loads glTF 1.0", function () {
    var arrayBuffer = generateJsonBuffer(gltf1).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1Updated);
    });
  });

  it("loads glTF 1.0 binary", function () {
    var gltf1Binary = clone(gltf1, true);
    gltf1Binary.buffers = {
      binary_glTF: {
        type: "arraybuffer",
        byteLength: 12,
        uri: "data:,",
      },
    };
    gltf1Binary.extensionsUsed = ["KHR_binary_glTF"];
    gltf1Binary.bufferViews.bufferView.buffer = "binary_glTF";

    var gltf1BinaryUpdated = clone(gltf1Updated, true);
    gltf1BinaryUpdated.buffers[0].name = "binary_glTF";
    delete gltf1BinaryUpdated.buffers[0].uri;

    var arrayBuffer = createGlb1(gltf1Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1BinaryUpdated);
    });
  });

  it("loads glTF 1.0 with data uri", function () {
    var gltf1DataUri = clone(gltf1, true);
    gltf1DataUri.buffers.buffer = {
      uri: "data:application/octet-stream;base64,AAAAAAAAAAAAAAAA",
    };

    var gltf1DataUriUpdated = clone(gltf1Updated, true);
    delete gltf1DataUriUpdated.buffers[0].uri;

    var arrayBuffer = generateJsonBuffer(gltf1DataUri).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1DataUriUpdated);
    });
  });

  it("loads glTF 2.0", function () {
    var arrayBuffer = generateJsonBuffer(gltf2).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2Updated);
    });
  });

  it("loads glTF 2.0 binary", function () {
    var gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    var gltf2BinaryUpdated = clone(gltf2Updated, true);
    delete gltf2BinaryUpdated.buffers[0].uri;

    var arrayBuffer = createGlb2(gltf2Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2BinaryUpdated);
    });
  });

  it("loads glTF 2.0 with data uri", function () {
    var gltf2DataUri = clone(gltf2, true);
    gltf2DataUri.buffers[0].uri =
      "data:application/octet-stream;base64,AAAAAAAAAAAAAAAA";

    var gltf2DataUriUpdated = clone(gltf2Updated, true);
    delete gltf2DataUriUpdated.buffers[0].uri;

    var arrayBuffer = generateJsonBuffer(gltf2DataUri).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2DataUriUpdated);
    });
  });

  it("loads typed array", function () {
    var gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    var gltf2BinaryUpdated = clone(gltf2Updated, true);
    delete gltf2BinaryUpdated.buffers[0].uri;

    var typedArray = createGlb2(gltf2Binary);

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      typedArray: typedArray,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2BinaryUpdated);
    });
  });

  it("loads JSON directly", function () {
    var gltf = clone(gltf2, true);

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      gltfJson: gltf,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      var gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2Updated);
    });
  });

  it("destroys", function () {
    var gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    var arrayBuffer = createGlb2(gltf2Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var unloadBuffer = spyOn(
      BufferLoader.prototype,
      "unload"
    ).and.callThrough();

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      expect(gltfJsonLoader.gltf).toBeDefined();
      expect(gltfJsonLoader.isDestroyed()).toBe(false);

      gltfJsonLoader.destroy();

      expect(gltfJsonLoader.gltf).not.toBeDefined();
      expect(gltfJsonLoader.isDestroyed()).toBe(true);
      expect(unloadBuffer).toHaveBeenCalled();
    });
  });

  function resolvesGltfAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      deferredPromise.promise
    );

    var arrayBuffer = generateJsonBuffer(gltf2).buffer;

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(gltfJsonLoader.gltf).not.toBeDefined();

    gltfJsonLoader.load();
    gltfJsonLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(arrayBuffer);
    }

    expect(gltfJsonLoader.gltf).not.toBeDefined();
    expect(gltfJsonLoader.isDestroyed()).toBe(true);
  }

  it("handles resolving glTF after destroy", function () {
    resolvesGltfAfterDestroy(false);
  });

  it("handles rejecting glTF after destroy", function () {
    resolvesGltfAfterDestroy(true);
  });

  function resolvesProcessedGltfAfterDestroy(reject) {
    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      when.resolve(generateJsonBuffer(gltf2).buffer)
    );

    var buffer = new Float32Array([0.0, 0.0, 0.0]).buffer;
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(gltfJsonLoader.gltf).not.toBeDefined();

    gltfJsonLoader.load();
    gltfJsonLoader.destroy();

    deferredPromise.resolve(buffer);

    expect(gltfJsonLoader.gltf).not.toBeDefined();
    expect(gltfJsonLoader.isDestroyed()).toBe(true);
  }

  it("handles resolving processed glTF after destroy", function () {
    resolvesProcessedGltfAfterDestroy(false);
  });

  it("handles rejecting processed glTF after destroy", function () {
    resolvesProcessedGltfAfterDestroy(true);
  });

  function resolvesTypedArrayAfterDestroy(reject) {
    var typedArray = generateJsonBuffer(gltf1);

    var buffer = new Float32Array([0.0, 0.0, 0.0]).buffer;
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    // Load a copy of the buffer into the cache so that the buffer loader
    // promise resolves even if the glTF loader is destroyed
    var bufferLoaderCopy = ResourceCache.loadExternalBuffer({
      resource: bufferResource,
    });

    var gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      typedArray: typedArray,
    });

    expect(gltfJsonLoader.gltf).not.toBeDefined();

    gltfJsonLoader.load();
    gltfJsonLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(buffer);
    }

    expect(gltfJsonLoader.gltf).not.toBeDefined();
    expect(gltfJsonLoader.isDestroyed()).toBe(true);

    ResourceCache.unload(bufferLoaderCopy);
  }

  it("handles resolving typed array after destroy", function () {
    return resolvesTypedArrayAfterDestroy(false);
  });

  it("handles rejecting typed array after destroy", function () {
    return resolvesTypedArrayAfterDestroy(true);
  });
});
