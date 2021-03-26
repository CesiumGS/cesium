import {
  GltfDracoCacheResource,
  Resource,
  ResourceCache,
  ResourceCacheKey,
} from "../../Source/Cesium.js";

describe("Scene/GltfDracoCacheResource", function () {
  var gltf = {
    buffers: [
      {
        byteLength: 32,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 32,
      },
    ],
  };

  var gltfResource = new Resource("https://example.com/model.gltf");
  var baseResource = new Resource("https://example.com/base.gltf");

  var dracoOptions = {
    bufferView: 0,
  };

  var cacheKey = ResourceCacheKey.getDracoCacheKey({
    gltf: gltf,
    draco: dracoOptions,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  it("Throws without resourceCache", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: undefined,
        gltf: gltf,
        draco: dracoOptions,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltf", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: ResourceCache,
        gltf: undefined,
        draco: dracoOptions,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without draco", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltfResource", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: dracoOptions,
        gltfResource: undefined,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without baseResource", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: dracoOptions,
        gltfResource: gltfResource,
        baseResource: undefined,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without cacheKey", function () {
    expect(function () {
      return new GltfDracoCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: dracoOptions,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("loads and decodes buffer", function () {
    fail();
  });

  it("unloads", function () {
    fail();
  });

  it("handles update before load finishes", function () {
    fail();
  });
});
