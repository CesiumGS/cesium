import {
  //CacheResourceState,
  GltfVertexBufferCacheResource,
  Resource,
  ResourceCache,
  ResourceCacheKey,
} from "../../Source/Cesium.js";

describe("Scene/GltfVertexBufferCacheResource", function () {
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
  var bufferViewId = 0;
  var gltfResource = new Resource("https://example.com/model.gltf");
  var baseResource = new Resource("https://example.com/model.gltf");
  var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: gltfResource,
    baseResource: baseResource,
  });

  it("Throws without resourceCache", function () {
    expect(function () {
      return new GltfVertexBufferCacheResource({
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
      return new GltfVertexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: undefined,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltfResource", function () {
    expect(function () {
      return new GltfVertexBufferCacheResource({
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
      return new GltfVertexBufferCacheResource({
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
      return new GltfVertexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("bufferViewId and draco are mutually exclusive", function () {
    expect(function () {
      return new GltfVertexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: {},
        bufferViewId: bufferViewId,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
    expect(function () {
      return new GltfVertexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("dracoAttributeSemantic must be defined if draco is defined", function () {
    expect(function () {
      return new GltfVertexBufferCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        draco: {},
        gltfResource: gltfResource,
        baseResource: baseResource,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("loads vertex buffer from buffer view", function () {
    /*
    var cacheResource = new GltfVertexBufferCacheResource({
      resourceCache: ResourceCache,
      gltf: gltf,
      bufferViewId: bufferViewId,
      gltfResource: gltfResource,
      baseResource: baseResource,
      cacheKey: cacheKey
    });
    cacheResource.load();
    TODO: how to simulate update(frameState)?
    */
    fail();
  });

  it("loads vertex buffer from draco", function () {
    fail();
  });

  it("unloads vertex buffer", function () {
    fail();
  });

  it("handles unload before load finishes", function () {
    fail();
    // TODO:  looks like GltfVertexBufferCacheResource doesn't pass the right
    // options to BufferCacheResource...
    /**
    var cacheResource = new GltfVertexBufferCacheResource({
      resourceCache: ResourceCache,
      gltf: gltf,
      bufferViewId: bufferViewId,
      gltfResource: gltfResource,
      baseResource: baseResource,
      cacheKey: cacheKey
    });
    expect(cacheResource.vertexBuffer).not.toBeDefined();
    cacheResource.load();
    expect(cacheResource._state).toBe(CacheResourceState.LOADING);
    cacheResource.unload();
    expect(cacheResource.vertexBuffer).not.toBeDefined();
    expect(cacheResource._state).not.toBeDefined();
    */
  });
});
