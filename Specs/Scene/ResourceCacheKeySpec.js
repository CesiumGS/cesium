import { Resource, ResourceCacheKey } from "../../Source/Cesium.js";

describe("ResourceCacheKey", function () {
  var schemaUri = "https://example.com/schema.json";
  var schemaResource = new Resource({ url: schemaUri });

  var gltfUri = "https://example.com/model.gltf";
  var gltfResource = new Resource({ url: gltfUri });

  var externalBufferUri = "https://example.com/external.bin";
  var imagesBufferUri = "https://example.com/images.bin";

  var parentUri = "https://example.com/parent.gltf";
  var parentResource = new Resource({ url: parentUri });

  var gltf = {
    images: [
      {
        bufferView: 2,
      },
    ],
    textures: [
      {
        sampler: 0,
        source: 0,
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
    accessors: [
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: 5123,
        count: 4,
        type: "SCALAR",
      },
    ],
    buffers: [
      {
        byteLength: 16,
      },
      {
        uri: "external.bin",
        byteLength: 32,
      },
      {
        uri: "images.bin",
        byteLength: 65536,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 4,
        byteLength: 4,
      },
      {
        buffer: 1,
        byteOffset: 8,
        byteLength: 4,
      },
      {
        buffer: 2,
        byteOffset: 0,
        byteLength: 65536,
      },
      {
        buffer: 0,
        byteOffset: 8,
        byteLength: 8,
      },
    ],
  };

  it("getSchemaCacheKey works for external schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    expect(cacheKey).toBe(schemaUri);
  });

  it("getSchemaCacheKey works for internal schemas", function () {
    var schema = {
      classes: {},
      enums: {},
    };
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schema,
    });

    expect(cacheKey).toEqual(JSON.stringify(schema));
  });

  it("getGltfCacheKey works", function () {
    var gltfUri = "https://example.com/model.gltf";
    var gltfResource = new Resource({ url: gltfUri });
    var cacheKey = ResourceCacheKey.getGltfCacheKey({
      gltfResource: gltfResource,
    });

    expect(cacheKey).toEqual(gltfUri);
  });

  it("getExternalBufferCacheKey works", function () {
    var bufferUri = "https://example.com/external.bin";
    var resource = new Resource({ url: bufferUri });
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });

    expect(cacheKey).toEqual(bufferUri);
  });

  it("getEmbeddedBufferCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: parentResource,
      bufferId: 0,
    });

    expect(cacheKey).toEqual(parentUri + "-buffer-0");
  });

  it("getBufferViewCacheKey works for embedded buffer", function () {
    var bufferViewId = 0;
    var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      gltf: gltf,
      bufferViewId: bufferViewId,
    });

    expect(cacheKey).toEqual(gltfUri + "-buffer-0-buffer-view-4-4");
  });

  it("getBufferViewCacheKey works for external buffer", function () {
    var bufferViewId = 1;
    var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      gltf: gltf,
      bufferViewId: bufferViewId,
    });

    expect(cacheKey).toEqual(externalBufferUri + "-buffer-view-8-4");
  });

  it("getVertexBufferCacheKey works", function () {
    var bufferViewId = 0;
    var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      gltf: gltf,
      bufferViewId: bufferViewId,
    });
    expect(cacheKey).toEqual(gltfUri + "-buffer-0-vertex-buffer-4-4");
  });

  it("getVertexBufferCacheKey works for draco", function () {
    var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      gltf: gltf,
      draco: {
        bufferView: 1,
      },
      dracoAttributeSemantic: "POSITION",
    });
    expect(cacheKey).toEqual(
      externalBufferUri + "-draco-8-4-vertex-buffer-POSITION"
    );
  });

  it("getIndexBufferCacheKey works", function () {
    var accessorId = 0;
    var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      accessorId: accessorId,
      gltf: gltf,
    });
    expect(cacheKey).toEqual(
      gltfUri + "-buffer-0-index-buffer-8-5123-SCALAR-4"
    );
  });

  it("getIndexBufferCacheKey works for draco", function () {
    var accessorId = 0;
    var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltfResource: gltfResource,
      baseResource: parentResource,
      accessorId: accessorId,
      draco: {
        bufferView: 0,
      },
      gltf: gltf,
    });
    expect(cacheKey).toEqual(gltfUri + "-buffer-0-draco-4-4-index-buffer");
  });

  it("getDracoCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getDracoCacheKey({
      gltf: gltf,
      draco: {
        bufferView: 0,
      },
      gltfResource: gltfResource,
      baseResource: parentResource,
    });
    expect(cacheKey).toEqual(gltfUri + "-buffer-0-draco-4-4");
  });

  it("getImageCacheKey works", function () {
    var imageId = 0;
    var cacheKey = ResourceCacheKey.getImageCacheKey({
      gltf: gltf,
      imageId: imageId,
      gltfResource: gltfResource,
      baseResource: parentResource,
      supportedImageFormats: {
        webp: true,
        s3tc: false,
        pvrtc: false,
        etc1: true,
      },
    });

    expect(cacheKey).toEqual(imagesBufferUri + "-image-0-65536");
  });

  it("getSamplerCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getSamplerCacheKey({
      gltf: gltf,
      textureInfo: {
        index: 0,
      },
    });
    expect(cacheKey).toEqual("sampler-10497-10497-9987-9729");
  });

  it("getTextureCacheKey works", function () {
    var imageId = 0;
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltf,
      imageId: imageId,
      gltfResource: gltfResource,
      baseResource: parentResource,
      textureInfo: {
        index: 0,
      },
      supportedImageFormats: {
        webp: true,
        s3tc: false,
        pvrtc: false,
        etc1: true,
      },
    });

    expect(cacheKey).toEqual(
      imagesBufferUri + "-image-0-65536-texture-sampler-10497-10497-9987-9729"
    );
  });
});
