import {
  GltfBufferViewCacheResource,
  Resource,
  ResourceCache,
  ResourceCacheKey,
} from "../../Source/Cesium.js";

describe("Scene/GltfBufferViewCacheResource", function () {
  var gltf = {
    buffers: [
      {
        byteLength: 32,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 4,
        byteLength: 4,
      },
    ],
  };
  var bufferViewId = 0;
  var gltfResource = new Resource("https://example.com/model.gltf");
  var baseResource = new Resource("https://example.com/model.gltf");
  var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  it("Throws without resourceCache", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: undefined,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltf", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: ResourceCache,
        gltf: undefined,
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without bufferViewId", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltfResource", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: undefined,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without baseResource", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: undefined,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without cacheKey", function () {
    expect(function () {
      return new GltfBufferViewCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("loads buffer view", function () {
    fail();
  });

  it("loads buffer view from embedded buffer", function () {
    fail();
  });

  it("loads buffer view from external buffer", function () {
    fail();
  });

  it("unloads buffer view", function () {
    fail();
  });
});
