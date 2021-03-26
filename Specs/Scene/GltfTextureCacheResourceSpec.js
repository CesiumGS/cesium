import {
  GltfTextureCacheResource,
  Resource,
  ResourceCache,
  ResourceCacheKey,
} from "../../Source/Cesium.js";

describe("Scene/GltfTextureCacheResource", function () {
  var gltf = {
    buffers: [
      {
        byteLength: 65536,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 65536,
      },
    ],
    samplers: [
      {
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 10497,
        wrapT: 10497,
      },
    ],
    images: [
      {
        bufferView: 0,
      },
    ],
    textures: [
      {
        sampler: 0,
        source: 0,
      },
    ],
  };

  var gltfResource = new Resource("https://example.com/model.gltf");
  var baseResource = new Resource("https://example.com/base.gltf");

  var supportedImageFormats = {
    webp: true,
    s3tc: false,
    pvrtc: false,
    etc1: true,
  };

  var textureInfo = {
    index: 0,
  };

  var imageId = 0;
  var cacheKey = ResourceCacheKey.getTextureCacheKey({
    gltf: gltf,
    imageId: imageId,
    gltfResource: gltfResource,
    baseResource: baseResource,
    textureInfo: textureInfo,
    supportedImageFormats: supportedImageFormats,
  });

  it("Throws without resourceCache", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: undefined,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltf", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: undefined,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without textureInfo", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without gltfResource", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: undefined,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without baseResource", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: undefined,
        supportedImageFormats: supportedImageFormats,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without supportedImageFormats", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: undefined,
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("throws for partially undefined supportedImageFormats", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: {
          s3tc: false,
          pvrtc: false,
          etc1: true,
        },
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: {
          wepb: true,
          pvrtc: false,
          etc1: true,
        },
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: {
          wepb: true,
          s3tc: false,
          etc1: true,
        },
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: {
          wepb: true,
          s3tc: false,
          pvrtc: false,
        },
        cacheKey: cacheKey,
      });
    }).toThrowDeveloperError();
  });

  it("Throws without cacheKey", function () {
    expect(function () {
      return new GltfTextureCacheResource({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: textureInfo,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        cacheKey: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("loads texture", function () {
    fail();
  });

  it("unloads texture", function () {
    fail();
  });

  it("handles update before load finishes", function () {
    fail();
  });
});
