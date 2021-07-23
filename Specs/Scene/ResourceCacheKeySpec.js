import {
  Resource,
  ResourceCacheKey,
  SupportedImageFormats,
} from "../../Source/Cesium.js";

describe("ResourceCacheKey", function () {
  var schemaUri = "https://example.com/schema.json";
  var schemaResource = new Resource({ url: schemaUri });

  var gltfUri = "https://example.com/parent.gltf";
  var gltfResource = new Resource({ url: gltfUri });

  var baseUri = "https://example.com/resources/";
  var baseResource = new Resource({ url: baseUri });

  var schemaJson = {};

  var bufferUri = "https://example.com/external.bin";
  var bufferResource = new Resource({ url: bufferUri });
  var bufferId = 0;

  var meshoptGltfEmbeddedBuffer = {
    buffers: [
      {
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 100,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 1,
            byteOffset: 25,
            byteLength: 50,
          },
        },
      },
    ],
  };

  var gltfEmbeddedBuffer = {
    buffers: [
      {
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 100,
      },
    ],
  };

  var gltfExternalBuffer = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 100,
      },
    ],
  };

  var gltfUncompressed = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 40,
      },
      {
        buffer: 0,
        byteOffset: 40,
        byteLength: 40,
      },
      {
        buffer: 0,
        byteOffset: 80,
        byteLength: 20,
      },
    ],
    accessors: [
      {
        componentType: 5126,
        count: 24,
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5],
        type: "VEC3",
        bufferView: 0,
        byteOffset: 0,
      },
      {
        componentType: 5126,
        count: 24,
        type: "VEC3",
        bufferView: 1,
        byteOffset: 0,
      },
      {
        componentType: 5123,
        count: 36,
        type: "SCALAR",
        bufferView: 2,
        byteOffset: 0,
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
          },
        ],
      },
    ],
  };

  var gltfDraco = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 100,
      },
    ],
    accessors: [
      {
        componentType: 5126,
        count: 24,
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5],
        type: "VEC3",
      },
      {
        componentType: 5126,
        count: 24,
        type: "VEC3",
      },
      {
        componentType: 5123,
        count: 36,
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

  var gltfWithTextures = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: 100,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 100,
      },
    ],
    images: [
      {
        uri: "image.png",
      },
      {
        mimeType: "image/jpeg",
        bufferView: 0,
      },
      {
        uri: "image.webp",
      },
      {
        uri: "image.ktx2",
      },
    ],
    textures: [
      {
        // Intentionally omitting sampler from this texture
        source: 0,
      },
      {
        sampler: 0,
        source: 1,
      },
      {
        source: 0,
        extensions: {
          EXT_texture_webp: {
            source: 2,
          },
        },
      },
      {
        source: 0,
        extensions: {
          KHR_texture_basisu: {
            source: 3,
          },
        },
      },
    ],
    samplers: [
      {
        magFilter: 9728,
        minFilter: 9984,
        wrapS: 33071,
        wrapT: 33648,
      },
    ],
  };

  it("getSchemaCacheKey works for external schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    expect(cacheKey).toBe("external-schema:" + schemaUri);
  });

  it("getSchemaCacheKey works for JSON schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schemaJson,
    });

    expect(cacheKey).toBe("embedded-schema:" + JSON.stringify(schemaJson));
  });

  it("getSchemaCacheKey throws if neither options.schema nor options.resource are defined", function () {
    expect(function () {
      ResourceCacheKey.getSchemaCacheKey({});
    }).toThrowDeveloperError();
  });

  it("getSchemaCacheKey throws if both options.schema and options.resource are defined", function () {
    expect(function () {
      ResourceCacheKey.getSchemaCacheKey({
        schema: schemaJson,
        resource: schemaResource,
      });
    }).toThrowDeveloperError();
  });

  it("getExternalBufferCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: bufferResource,
    });

    expect(cacheKey).toBe("external-buffer:" + bufferUri);
  });

  it("getExternalBufferCacheKey throws if resource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({});
    }).toThrowDeveloperError();
  });

  it("getEmbeddedBufferCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: gltfResource,
      bufferId: bufferId,
    });

    expect(cacheKey).toBe("embedded-buffer:" + gltfUri + "-buffer-id-0");
  });

  it("getEmbeddedBufferCacheKey throws if parentResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({
        bufferId: bufferId,
      });
    }).toThrowDeveloperError();
  });

  it("getEmbeddedBufferCacheKey throws if bufferId is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({
        parentResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("getGltfCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getGltfCacheKey({
      gltfResource: gltfResource,
    });

    expect(cacheKey).toBe("gltf:" + gltfUri);
  });

  it("getGltfCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getGltfCacheKey({});
    }).toThrowDeveloperError();
  });

  it("getBufferViewCacheKey works with embedded buffer", function () {
    var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltf: gltfEmbeddedBuffer,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "buffer-view:" + gltfUri + "-buffer-id-0-range-0-100"
    );
  });

  it("getBufferViewCacheKey works with external buffer", function () {
    var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltf: gltfExternalBuffer,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "buffer-view:https://example.com/resources/external.bin-range-0-100"
    );
  });

  it("getBufferViewCacheKey works with meshopt", function () {
    var cacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltf: meshoptGltfEmbeddedBuffer,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "buffer-view:" + gltfUri + "-buffer-id-1-range-25-75"
    );
  });

  it("getBufferViewCacheKey throws if gltf is undefined", function () {
    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: undefined,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getBufferViewCacheKey throws if bufferViewId is undefined", function () {
    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfEmbeddedBuffer,
        bufferViewId: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getBufferViewCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfEmbeddedBuffer,
        bufferViewId: 0,
        gltfResource: undefined,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getBufferViewCacheKey throws if baseResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfEmbeddedBuffer,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getDracoCacheKey works", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    var cacheKey = ResourceCacheKey.getDracoCacheKey({
      gltf: gltfDraco,
      draco: draco,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "draco:https://example.com/resources/external.bin-range-0-100"
    );
  });

  it("getDracoCacheKey throws if gltf is undefined", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: undefined,
        draco: draco,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getDracoCacheKey throws if draco is undefined", function () {
    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfDraco,
        draco: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getDracoCacheKey throws if gltfResource is undefined", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfDraco,
        draco: draco,
        gltfResource: undefined,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getDracoCacheKey throws if baseResource is undefined", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    expect(function () {
      ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfDraco,
        draco: draco,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey works from buffer view", function () {
    var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltf: gltfUncompressed,
      gltfResource: gltfResource,
      baseResource: baseResource,
      bufferViewId: 0,
    });

    expect(cacheKey).toBe(
      "vertex-buffer:https://example.com/resources/external.bin-range-0-40"
    );
  });

  it("getVertexBufferCacheKey works from draco", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    var cacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltf: gltfDraco,
      gltfResource: gltfResource,
      baseResource: baseResource,
      draco: draco,
      dracoAttributeSemantic: "POSITION",
    });

    expect(cacheKey).toBe(
      "vertex-buffer:https://example.com/resources/external.bin-range-0-100-draco-POSITION"
    );
  });

  it("getVertexBufferCacheKey throws if gltf is undefined", function () {
    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        bufferViewId: 0,
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfUncompressed,
        gltfResource: undefined,
        baseResource: baseResource,
        bufferViewId: 0,
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey throws if baseResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: undefined,
        bufferViewId: 0,
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey throws if both bufferViewId and draco are undefined", function () {
    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey throws if both bufferViewId and draco are defined", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: baseResource,
        bufferViewId: 0,
        draco: draco,
        dracoAttributeSemantic: "POSITION",
      });
    }).toThrowDeveloperError();
  });

  it("getVertexBufferCacheKey throws if both draco is defined and dracoAttributeSemantic is undefined", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    expect(function () {
      ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: baseResource,
        draco: draco,
        dracoAttributeSemantic: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getIndexBufferCacheKey works from buffer view", function () {
    var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltf: gltfUncompressed,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "index-buffer:https://example.com/resources/external.bin-accessor-80-5123-SCALAR-36"
    );
  });

  it("getIndexBufferCacheKey works from draco", function () {
    var draco =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    var cacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltf: gltfDraco,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: baseResource,
      draco: draco,
    });

    expect(cacheKey).toBe(
      "index-buffer:https://example.com/resources/external.bin-range-0-100-draco"
    );
  });

  it("getIndexBufferCacheKey throws if gltf is undefined", function () {
    expect(function () {
      ResourceCacheKey.getIndexBufferCacheKey({
        gltf: undefined,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getIndexBufferCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getIndexBufferCacheKey({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: undefined,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getIndexBufferCacheKey throws if baseResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getIndexBufferCacheKey({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getImageCacheKey works from uri", function () {
    var cacheKey = ResourceCacheKey.getImageCacheKey({
      gltf: gltfWithTextures,
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe("image:https://example.com/resources/image.png");
  });

  it("getImageCacheKey works from buffer view", function () {
    var cacheKey = ResourceCacheKey.getImageCacheKey({
      gltf: gltfWithTextures,
      imageId: 1,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    expect(cacheKey).toBe(
      "image:https://example.com/resources/external.bin-range-0-100"
    );
  });

  it("getImageCacheKey throws if gltf is undefined", function () {
    expect(function () {
      ResourceCacheKey.getImageCacheKey({
        gltf: undefined,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getImageCacheKey throws if imageId is undefined", function () {
    expect(function () {
      ResourceCacheKey.getImageCacheKey({
        gltf: gltfWithTextures,
        imageId: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getImageCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getImageCacheKey({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: undefined,
        baseResource: baseResource,
      });
    }).toThrowDeveloperError();
  });

  it("getImageCacheKey throws if baseResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getImageCacheKey({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getTextureCacheKey works with default sampler", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 0,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/image.png-sampler-10497-10497-9729-9729"
    );
  });

  it("getTextureCacheKey works with explicit sampler", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 1,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/external.bin-range-0-100-sampler-33071-33648-9984-9728"
    );
  });

  it("getTextureCacheKey works with EXT_texture_webp extension", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 2,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats({
        webp: true,
      }),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/image.webp-sampler-10497-10497-9729-9729"
    );
  });

  it("getTextureCacheKey ignores EXT_texture_webp extension if WebP is not supported", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 2,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/image.png-sampler-10497-10497-9729-9729"
    );
  });

  it("getTextureCacheKey works with KHR_texture_basisu extension", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 3,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats({
        basis: true,
      }),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/image.ktx2-sampler-10497-10497-9729-9729"
    );
  });

  it("getTextureCacheKey ignores KHR_texture_basisu extension if Basis is not supported", function () {
    var cacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: {
        index: 3,
        texCoord: 0,
      },
      gltfResource: gltfResource,
      baseResource: baseResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(cacheKey).toBe(
      "texture:https://example.com/resources/image.png-sampler-10497-10497-9729-9729"
    );
  });

  it("getTextureCacheKey throws if gltf is undefined", function () {
    expect(function () {
      ResourceCacheKey.getTextureCacheKey({
        gltf: undefined,
        textureInfo: {
          index: 0,
          texCoord: 0,
        },
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getTextureCacheKey throws if textureInfo is undefined", function () {
    expect(function () {
      ResourceCacheKey.getTextureCacheKey({
        gltf: gltfWithTextures,
        textureInfo: undefined,
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getTextureCacheKey throws if gltfResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getTextureCacheKey({
        gltf: gltfWithTextures,
        textureInfo: {
          index: 0,
          texCoord: 0,
        },
        gltfResource: undefined,
        baseResource: baseResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getTextureCacheKey throws if baseResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getTextureCacheKey({
        gltf: gltfWithTextures,
        textureInfo: {
          index: 0,
          texCoord: 0,
        },
        gltfResource: gltfResource,
        baseResource: undefined,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getTextureCacheKey throws if supportedImageFormats is undefined", function () {
    expect(function () {
      ResourceCacheKey.getTextureCacheKey({
        gltf: gltfWithTextures,
        textureInfo: {
          index: 0,
          texCoord: 0,
        },
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: undefined,
      });
    }).toThrowDeveloperError();
  });
});
