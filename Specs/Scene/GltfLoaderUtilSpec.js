import {
  GltfLoaderUtil,
  SupportedImageFormats,
  TextureWrap,
  TextureMagnificationFilter,
  TextureMinificationFilter,
} from "../../Source/Cesium.js";

describe("Scene/GltfLoaderUtil", function () {
  var gltfWithTextures = {
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
    ],
    textures: [
      {
        source: 0,
      },
      {
        source: 0,
        extensions: {
          EXT_texture_webp: {
            source: 2,
          },
        },
      },
    ],
  };

  it("getImageIdFromTexture throws if gltf is undefined", function () {
    expect(function () {
      GltfLoaderUtil.getImageIdFromTexture({
        gltf: undefined,
        textureId: 0,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getImageIdFromTexture throws if textureId is undefined", function () {
    expect(function () {
      GltfLoaderUtil.getImageIdFromTexture({
        gltf: gltfWithTextures,
        textureId: undefined,
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("getImageIdFromTexture throws if supportedImageFormats is undefined", function () {
    expect(function () {
      GltfLoaderUtil.getImageIdFromTexture({
        gltf: gltfWithTextures,
        textureId: 0,
        supportedImageFormats: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("getImageIdFromTexture gets image id", function () {
    var imageId = GltfLoaderUtil.getImageIdFromTexture({
      gltf: gltfWithTextures,
      textureId: 0,
      supportedImageFormats: new SupportedImageFormats(),
    });
    expect(imageId).toBe(0);
  });

  it("getImageIdFromTexture gets WebP image when EXT_texture_webp extension is supported", function () {
    var imageId = GltfLoaderUtil.getImageIdFromTexture({
      gltf: gltfWithTextures,
      textureId: 1,
      supportedImageFormats: new SupportedImageFormats({
        webp: true,
      }),
    });
    expect(imageId).toBe(2);
  });

  it("getImageIdFromTexture gets default image when EXT_texture_webp extension is not supported", function () {
    var imageId = GltfLoaderUtil.getImageIdFromTexture({
      gltf: gltfWithTextures,
      textureId: 1,
      supportedImageFormats: new SupportedImageFormats({
        webp: false,
      }),
    });
    expect(imageId).toBe(0);
  });

  it("createSampler throws if gltf is undefined", function () {
    expect(function () {
      GltfLoaderUtil.getImageIdFromTexture({
        gltf: undefined,
        textureInfo: {
          index: 0,
        },
      });
    }).toThrowDeveloperError();
  });

  it("createSampler throws if gltf is undefined", function () {
    expect(function () {
      GltfLoaderUtil.getImageIdFromTexture({
        gltf: gltfWithTextures,
        textureInfo: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("createSampler gets default sampler when texture does not have a sampler", function () {
    var sampler = GltfLoaderUtil.createSampler({
      gltf: {
        textures: [
          {
            source: 0,
          },
        ],
      },
      textureInfo: {
        index: 0,
      },
    });
    expect(sampler.wrapS).toBe(TextureWrap.REPEAT);
    expect(sampler.wrapT).toBe(TextureWrap.REPEAT);
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.LINEAR);
    expect(sampler.magnificationFilter).toBe(TextureMagnificationFilter.LINEAR);
  });

  function createSampler(options) {
    var gltf = {
      textures: [
        {
          source: 0,
          sampler: 0,
        },
      ],
      samplers: [
        {
          minFilter: options.minFilter,
          magFilter: options.magFilter,
          wrapS: options.wrapS,
          wrapT: options.wrapT,
        },
      ],
    };

    var textureInfo = {
      index: 0,
    };

    if (options.useTextureTransform) {
      textureInfo.extensions = {
        KHR_texture_transform: {},
      };
    }

    return GltfLoaderUtil.createSampler({
      gltf: gltf,
      textureInfo: textureInfo,
    });
  }

  it("createSampler fills in undefined sampler properties", function () {
    var sampler = createSampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
    });

    expect(sampler.wrapS).toBe(TextureWrap.CLAMP_TO_EDGE);
    expect(sampler.wrapT).toBe(TextureWrap.REPEAT);
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.LINEAR);
    expect(sampler.magnificationFilter).toBe(TextureMagnificationFilter.LINEAR);
  });

  it("createSampler creates non-mipmap sampler for KHR_texture_transform", function () {
    var sampler = createSampler({
      minFilter: TextureMinificationFilter.NEAREST_MIPMAP_NEAREST,
      useTextureTransform: true,
    });
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.NEAREST);

    sampler = createSampler({
      minFilter: TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
      useTextureTransform: true,
    });
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.NEAREST);

    sampler = createSampler({
      minFilter: TextureMinificationFilter.LINEAR_MIPMAP_NEAREST,
      useTextureTransform: true,
    });
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.LINEAR);

    sampler = createSampler({
      minFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
      useTextureTransform: true,
    });
    expect(sampler.minificationFilter).toBe(TextureMinificationFilter.LINEAR);
  });
});
