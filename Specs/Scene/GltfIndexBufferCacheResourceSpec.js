import {
  GltfIndexBufferCacheResource,
  Resource,
  ResourceCache,
  ResourceCacheKey,
} from "../../Source/Cesium.js";

describe("Scene/GltfIndexBufferCacheResource", function () {
  var gltf = {
    buffers: [
      {
        byteLength: 8,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 8,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5123,
        count: 4,
        type: "SCALAR",
      },
    ],
  };

  var gltfResource = new Resource("https://example.com/model.gltf");
  var baseResource = new Resource("https://example.com/base.gltf");

  var accessorId = 0;
  var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
    gltfResource: gltfResource,
    baseResource: baseResource,
    accessorId: accessorId,
    gltf: gltf,
  });

  it("Throws without resourceCache", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: undefined,
        gltf: gltf,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltf", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: undefined,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without accessorId", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        accessorId: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltfResource", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        accessorId: accessorId,
        gltfResource: undefined,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without baseResource", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: undefined,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without cacheKey", function () {
    expect(function () {
      return new GltfIndexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        accessorId: accessorId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("loads index buffer from buffer view", function () {
    fail();
  });

  it("loads index buffer from draco", function () {
    fail();
  });

  it("unloads index buffer", function () {
    fail();
  });

  it("handles unload before load finishes", function () {
    fail();
  });
});
