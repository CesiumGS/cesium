import {
  GltfLoaderUtil,
  Matrix3,
  PixelDatatype,
  PixelFormat,
  SupportedImageFormats,
  Texture,
  TextureWrap,
  TextureMagnificationFilter,
  TextureMinificationFilter,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

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

  it("createModelTexture creates texture with default values", function () {
    var textureInfo = {
      index: 0,
    };

    var modelTexture = GltfLoaderUtil.createModelTexture({
      textureInfo: textureInfo,
    });

    expect(modelTexture.texture).toBeUndefined();
    expect(modelTexture.texCoord).toBe(0);
    expect(modelTexture.transform).toBeUndefined();
    expect(modelTexture.channels).toBeUndefined();
  });

  it("createModelTexture creates texture with KHR_texture_transform extension", function () {
    var textureInfo = {
      index: 0,
      texCoord: 0,
      extensions: {
        KHR_texture_transform: {
          offset: [0.5, 0.5],
          scale: [0.1, 0.2],
          texCoord: 1,
        },
      },
    };

    // prettier-ignore
    var expectedTransform = new Matrix3(
      0.1, 0.0, 0.5,
      0.0, 0.2, 0.5,
      0.0, 0.0, 1.0
    );

    var modelTexture = GltfLoaderUtil.createModelTexture({
      textureInfo: textureInfo,
    });

    expect(modelTexture.texCoord).toBe(1);
    expect(modelTexture.transform).toEqual(expectedTransform);
  });

  it("createModelTexture creates texture", function () {
    var context = createContext();

    var texture = new Texture({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        arrayBufferView: new Uint8Array([1, 2, 3, 4]),
        width: 1,
        height: 1,
      },
    });

    var textureInfo = {
      index: 0,
      texCoord: 1,
    };

    var modelTexture = GltfLoaderUtil.createModelTexture({
      textureInfo: textureInfo,
      channels: "r",
      texture: texture,
    });

    expect(modelTexture.texture).toBe(texture);
    expect(modelTexture.texCoord).toBe(1);
    expect(modelTexture.transform).toBeUndefined();
    expect(modelTexture.channels).toBe("r");

    texture.destroy();
    context.destroyForSpecs();
  });

  it("createModelTexture throws if textureInfo is undefined", function () {
    expect(function () {
      GltfLoaderUtil.createModelTexture();
    }).toThrowDeveloperError();
  });
});
