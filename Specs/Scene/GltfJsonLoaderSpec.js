import {
  BufferLoader,
  clone,
  GltfJsonLoader,
  Resource,
  ResourceCache,
} from "../../Source/Cesium.js";
import generateJsonBuffer from "../generateJsonBuffer.js";

describe("Scene/GltfJsonLoader", function () {
  const gltfUri = "https://example.com/model.glb";
  const gltfResource = new Resource({
    url: gltfUri,
  });

  const gltf1 = {
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

  const gltf1Updated = {
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

  const gltf2 = {
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

  const gltf2Updated = {
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
    const jsonBuffer = generateJsonBuffer(json, 12, 4);
    const positionBuffer = new Float32Array([0.0, 0.0, 0.0]);
    const binaryBuffer = new Uint8Array(positionBuffer.buffer);
    const glbLength = 20 + jsonBuffer.byteLength + binaryBuffer.byteLength;
    const glb = new Uint8Array(glbLength);
    const dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);

    // Write binary glTF header (magic, version, length)
    let byteOffset = 0;
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
    const jsonBuffer = generateJsonBuffer(json, 12, 4);
    const positionBuffer = new Float32Array([0.0, 0.0, 0.0]);
    const binaryBuffer = new Uint8Array(positionBuffer.buffer);
    const glbLength =
      12 + 8 + jsonBuffer.byteLength + 8 + binaryBuffer.byteLength;
    const glb = new Uint8Array(glbLength);
    const dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);

    // Write binary glTF header (magic, version, length)
    let byteOffset = 0;
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
    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.callFake(function () {
      const error = new Error("404 Not Found");
      return Promise.reject(error);
    });

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise
      .then(function (gltfJsonLoader) {
        fail();
      })
      .catch(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\n404 Not Found"
        );
      });
  });

  it("rejects promise if glTF fails to process", function () {
    const arrayBuffer = generateJsonBuffer(gltf1).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      const error = new Error("404 Not Found");
      return Promise.reject(error);
    });

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise
      .then(function (gltfJsonLoader) {
        fail();
      })
      .catch(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("rejects promise if glTF fails to process from typed array", function () {
    const typedArray = createGlb1(gltf1);

    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      const error = new Error("404 Not Found");
      return Promise.reject(error);
    });

    const gltfJsonLoader = new GltfJsonLoader({
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
      .catch(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load glTF: https://example.com/model.glb\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("loads glTF 1.0", function () {
    const arrayBuffer = generateJsonBuffer(gltf1).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1Updated);
    });
  });

  it("loads glTF 1.0 binary", function () {
    const gltf1Binary = clone(gltf1, true);
    gltf1Binary.buffers = {
      binary_glTF: {
        type: "arraybuffer",
        byteLength: 12,
        uri: "data:,",
      },
    };
    gltf1Binary.extensionsUsed = ["KHR_binary_glTF"];
    gltf1Binary.bufferViews.bufferView.buffer = "binary_glTF";

    const gltf1BinaryUpdated = clone(gltf1Updated, true);
    gltf1BinaryUpdated.buffers[0].name = "binary_glTF";
    delete gltf1BinaryUpdated.buffers[0].uri;

    const arrayBuffer = createGlb1(gltf1Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1BinaryUpdated);
    });
  });

  it("loads glTF 1.0 with data uri", function () {
    const gltf1DataUri = clone(gltf1, true);
    gltf1DataUri.buffers.buffer = {
      uri: "data:application/octet-stream;base64,AAAAAAAAAAAAAAAA",
    };

    const gltf1DataUriUpdated = clone(gltf1Updated, true);
    delete gltf1DataUriUpdated.buffers[0].uri;

    const arrayBuffer = generateJsonBuffer(gltf1DataUri).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf1DataUriUpdated);
    });
  });

  it("loads glTF 2.0", function () {
    const arrayBuffer = generateJsonBuffer(gltf2).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2Updated);
    });
  });

  it("loads glTF 2.0 binary", function () {
    const gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    const gltf2BinaryUpdated = clone(gltf2Updated, true);
    delete gltf2BinaryUpdated.buffers[0].uri;

    const arrayBuffer = createGlb2(gltf2Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2BinaryUpdated);
    });
  });

  it("loads glTF 2.0 with data uri", function () {
    const gltf2DataUri = clone(gltf2, true);
    gltf2DataUri.buffers[0].uri =
      "data:application/octet-stream;base64,AAAAAAAAAAAAAAAA";

    const gltf2DataUriUpdated = clone(gltf2Updated, true);
    delete gltf2DataUriUpdated.buffers[0].uri;

    const arrayBuffer = generateJsonBuffer(gltf2DataUri).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2DataUriUpdated);
    });
  });

  it("loads typed array", function () {
    const gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    const gltf2BinaryUpdated = clone(gltf2Updated, true);
    delete gltf2BinaryUpdated.buffers[0].uri;

    const typedArray = createGlb2(gltf2Binary);

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      typedArray: typedArray,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2BinaryUpdated);
    });
  });

  it("loads JSON directly", function () {
    const gltf = clone(gltf2, true);

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(new Float32Array([0.0, 0.0, 0.0]).buffer)
    );

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      gltfJson: gltf,
    });

    gltfJsonLoader.load();

    return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
      const gltf = gltfJsonLoader.gltf;
      expect(gltf).toEqual(gltf2Updated);
    });
  });

  it("destroys", function () {
    const gltf2Binary = clone(gltf2, true);
    delete gltf2Binary.buffers[0].uri;

    const arrayBuffer = createGlb2(gltf2Binary).buffer;

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const unloadBuffer = spyOn(
      BufferLoader.prototype,
      "unload"
    ).and.callThrough();

    const gltfJsonLoader = new GltfJsonLoader({
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

  function resolvesGltfAfterDestroy(rejectPromise) {
    const arrayBuffer = generateJsonBuffer(gltf2).buffer;
    const promise = new Promise(function (resolve, reject) {
      if (rejectPromise) {
        reject(new Error());
        return;
      }

      resolve(arrayBuffer);
    });

    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(promise);

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(gltfJsonLoader.gltf).not.toBeDefined();

    gltfJsonLoader.load();
    gltfJsonLoader.destroy();
    return gltfJsonLoader.promise.then(function () {
      expect(gltfJsonLoader.gltf).not.toBeDefined();
      expect(gltfJsonLoader.isDestroyed()).toBe(true);
    });
  }

  it("handles resolving glTF after destroy", function () {
    return resolvesGltfAfterDestroy(false);
  });

  it("handles rejecting glTF after destroy", function () {
    return resolvesGltfAfterDestroy(true);
  });

  function resolvesProcessedGltfAfterDestroy(rejectPromise) {
    spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
      Promise.resolve(generateJsonBuffer(gltf2).buffer)
    );

    const buffer = new Float32Array([0.0, 0.0, 0.0]).buffer;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      return new Promise(function (resolve, reject) {
        if (rejectPromise) {
          reject(new Error());
        } else {
          resolve(buffer);
        }
      });
    });

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(gltfJsonLoader.gltf).not.toBeDefined();

    const promise = gltfJsonLoader.load();
    gltfJsonLoader.destroy();
    return promise.finally(function () {
      expect(gltfJsonLoader.gltf).not.toBeDefined();
      expect(gltfJsonLoader.isDestroyed()).toBe(true);
    });
  }

  it("handles resolving processed glTF after destroy", function () {
    return resolvesProcessedGltfAfterDestroy(false);
  });

  it("handles rejecting processed glTF after destroy", function () {
    return resolvesProcessedGltfAfterDestroy(true);
  });

  function resolvesTypedArrayAfterDestroy(rejectPromise) {
    const typedArray = generateJsonBuffer(gltf1);

    const gltfJsonLoader = new GltfJsonLoader({
      resourceCache: ResourceCache,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      typedArray: typedArray,
    });

    const buffer = new Float32Array([0.0, 0.0, 0.0]).buffer;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      return new Promise(function (resolve, reject) {
        if (rejectPromise) {
          reject(new Error());
          return;
        }

        resolve(buffer);
      });
    });
    expect(gltfJsonLoader.gltf).not.toBeDefined();

    gltfJsonLoader.load();
    gltfJsonLoader.destroy();
    return gltfJsonLoader.promise.then(function () {
      expect(gltfJsonLoader.gltf).not.toBeDefined();
      expect(gltfJsonLoader.isDestroyed()).toBe(true);
    });
  }

  it("handles resolving typed array after destroy", function () {
    return resolvesTypedArrayAfterDestroy(false);
  });

  it("handles rejecting typed array after destroy", function () {
    return resolvesTypedArrayAfterDestroy(true);
  });
});
