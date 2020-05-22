import PixelDatatype from "../Renderer/PixelDatatype.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * The format of a pixel, i.e., the number of components it has and what they represent.
 * <br/>像素的格式，也就是说每个像素中颜色由哪些组成以及如何展示。
 * @exports PixelFormat
 */
var PixelFormat = {
  /**
   * A pixel format containing a depth value.
   * <br/>包含有一个深度值。
   * <br/>
   * @type {Number}
   * @constant
   */
  DEPTH_COMPONENT: WebGLConstants.DEPTH_COMPONENT,

  /**
   * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
   * <br/>包含有深度值和模板（stencil）值，常常与{@link PixelDatatype.UNSIGNED_INT_24_8}一起使用。
   * <br/>参考：{@link https://gavinkg.github.io/ILearnVulkanFromScratch-CN/mdroot/Vulkan%20%E8%BF%9B%E9%98%B6/%E6%A8%A1%E6%9D%BF%E7%BC%93%E5%86%B2%E5%92%8C%E6%A8%A1%E6%9D%BF%E6%B5%8B%E8%AF%95.html 模板缓冲和模板测试}、{@link https://learnopengl-cn.readthedocs.io/zh/latest/04%20Advanced%20OpenGL/02%20Stencil%20testing/ 模板测试}
   * @type {Number}
   * @constant
   */
  DEPTH_STENCIL: WebGLConstants.DEPTH_STENCIL,

  /**
   * A pixel format containing an alpha channel.
   * <br/>包含有一个阿尔法通道
   * @type {Number}
   * @constant
   */
  ALPHA: WebGLConstants.ALPHA,

  /**
   * A pixel format containing red, green, and blue channels.
   * <br/>包含有红、绿、蓝三个通道
   * @type {Number}
   * @constant
   */
  RGB: WebGLConstants.RGB,

  /**
   * A pixel format containing red, green, blue, and alpha channels.
   * <br/>包含有红、绿、蓝、阿尔法四个通道
   * @type {Number}
   * @constant
   */
  RGBA: WebGLConstants.RGBA,

  /**
   * A pixel format containing a luminance (intensity) channel.
   * <br/>包含有一个亮度通道
   * @type {Number}
   * @constant
   */
  LUMINANCE: WebGLConstants.LUMINANCE,

  /**
   * A pixel format containing luminance (intensity) and alpha channels.
   * <br/>包含有一个亮度和阿尔法通道
   * @type {Number}
   * @constant
   */
  LUMINANCE_ALPHA: WebGLConstants.LUMINANCE_ALPHA,

  /**
   * A pixel format containing red, green, and blue channels that is DXT1 compressed.
   * <br/>包含有经过DXT1压缩过的红、绿、蓝通道
   * @type {Number}
   * @constant
   */
  RGB_DXT1: WebGLConstants.COMPRESSED_RGB_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
   * <br/>包含有经过DXT1压缩过的红、绿、蓝、阿尔法通道
   * @type {Number}
   * @constant
   */
  RGBA_DXT1: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
   * <br/>包含有经过DXT3压缩过的红、绿、蓝、阿尔法通道
   * @type {Number}
   * @constant
   */
  RGBA_DXT3: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
   * <br/>包含有经过DXT5压缩过的红、绿、蓝、阿尔法通道
   * @type {Number}
   * @constant
   */
  RGBA_DXT5: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
   * <br/>包含有经过PVR 4bpp压缩过的红、绿、蓝通道
   * <br/>参考：{@link https://oedx.github.io/2019/06/20/CocosCreator-TextureCompression-Plugin/#PVRTC PVRTC}
   *
   * @type {Number}
   * @constant
   */
  RGB_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
   * <br/>包含有经过PVR 2bpp压缩过的红、绿、蓝通道
   * <br/>参考：{@link https://oedx.github.io/2019/06/20/CocosCreator-TextureCompression-Plugin/#PVRTC PVRTC}
   *
   * @type {Number}
   * @constant
   */
  RGB_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
   * <br/>包含有经过PVR 4bpp压缩过的红、绿、蓝、阿尔法通道
   * <br/>参考：{@link https://oedx.github.io/2019/06/20/CocosCreator-TextureCompression-Plugin/#PVRTC PVRTC}
   *
   * @type {Number}
   * @constant
   */
  RGBA_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
   * <br/>包含有经过PVR 2bpp压缩过的红、绿、蓝、阿尔法通道
   * <br/>参考：{@link https://oedx.github.io/2019/06/20/CocosCreator-TextureCompression-Plugin/#PVRTC PVRTC}
   *
   * @type {Number}
   * @constant
   */
  RGBA_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, and blue channels that is ETC1 compressed.
   * <br/>包含有经过ETC1压缩过的红、绿、蓝通道
   *
   * @type {Number}
   * @constant
   */
  RGB_ETC1: WebGLConstants.COMPRESSED_RGB_ETC1_WEBGL,

  /**
   * @private
   */
  componentsLength: function (pixelFormat) {
    switch (pixelFormat) {
      case PixelFormat.RGB:
        return 3;
      case PixelFormat.RGBA:
        return 4;
      case PixelFormat.LUMINANCE_ALPHA:
        return 2;
      case PixelFormat.ALPHA:
      case PixelFormat.LUMINANCE:
        return 1;
      default:
        return 1;
    }
  },

  /**
   * @private
   */
  validate: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.DEPTH_COMPONENT ||
      pixelFormat === PixelFormat.DEPTH_STENCIL ||
      pixelFormat === PixelFormat.ALPHA ||
      pixelFormat === PixelFormat.RGB ||
      pixelFormat === PixelFormat.RGBA ||
      pixelFormat === PixelFormat.LUMINANCE ||
      pixelFormat === PixelFormat.LUMINANCE_ALPHA ||
      pixelFormat === PixelFormat.RGB_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT3 ||
      pixelFormat === PixelFormat.RGBA_DXT5 ||
      pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
      pixelFormat === PixelFormat.RGB_ETC1
    );
  },

  /**
   * @private
   */
  isColorFormat: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.ALPHA ||
      pixelFormat === PixelFormat.RGB ||
      pixelFormat === PixelFormat.RGBA ||
      pixelFormat === PixelFormat.LUMINANCE ||
      pixelFormat === PixelFormat.LUMINANCE_ALPHA
    );
  },

  /**
   * @private
   */
  isDepthFormat: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.DEPTH_COMPONENT ||
      pixelFormat === PixelFormat.DEPTH_STENCIL
    );
  },

  /**
   * @private
   */
  isCompressedFormat: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.RGB_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT3 ||
      pixelFormat === PixelFormat.RGBA_DXT5 ||
      pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
      pixelFormat === PixelFormat.RGB_ETC1
    );
  },

  /**
   * @private
   */
  isDXTFormat: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.RGB_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT1 ||
      pixelFormat === PixelFormat.RGBA_DXT3 ||
      pixelFormat === PixelFormat.RGBA_DXT5
    );
  },

  /**
   * @private
   */
  isPVRTCFormat: function (pixelFormat) {
    return (
      pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
      pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1
    );
  },

  /**
   * @private
   */
  isETC1Format: function (pixelFormat) {
    return pixelFormat === PixelFormat.RGB_ETC1;
  },

  /**
   * @private
   */
  compressedTextureSizeInBytes: function (pixelFormat, width, height) {
    switch (pixelFormat) {
      case PixelFormat.RGB_DXT1:
      case PixelFormat.RGBA_DXT1:
      case PixelFormat.RGB_ETC1:
        return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;

      case PixelFormat.RGBA_DXT3:
      case PixelFormat.RGBA_DXT5:
        return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

      case PixelFormat.RGB_PVRTC_4BPPV1:
      case PixelFormat.RGBA_PVRTC_4BPPV1:
        return Math.floor(
          (Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8
        );

      case PixelFormat.RGB_PVRTC_2BPPV1:
      case PixelFormat.RGBA_PVRTC_2BPPV1:
        return Math.floor(
          (Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8
        );

      default:
        return 0;
    }
  },

  /**
   * @private
   */
  textureSizeInBytes: function (pixelFormat, pixelDatatype, width, height) {
    var componentsLength = PixelFormat.componentsLength(pixelFormat);
    if (PixelDatatype.isPacked(pixelDatatype)) {
      componentsLength = 1;
    }
    return (
      componentsLength *
      PixelDatatype.sizeInBytes(pixelDatatype) *
      width *
      height
    );
  },

  /**
   * @private
   */
  alignmentInBytes: function (pixelFormat, pixelDatatype, width) {
    var mod =
      PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, 1) % 4;
    return mod === 0 ? 4 : mod === 2 ? 2 : 1;
  },

  /**
   * @private
   */
  createTypedArray: function (pixelFormat, pixelDatatype, width, height) {
    var constructor;
    var sizeInBytes = PixelDatatype.sizeInBytes(pixelDatatype);
    if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
      constructor = Uint8Array;
    } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
      constructor = Uint16Array;
    } else if (
      sizeInBytes === Float32Array.BYTES_PER_ELEMENT &&
      pixelDatatype === PixelDatatype.FLOAT
    ) {
      constructor = Float32Array;
    } else {
      constructor = Uint32Array;
    }

    var size = PixelFormat.componentsLength(pixelFormat) * width * height;
    return new constructor(size);
  },

  /**
   * @private
   */
  flipY: function (bufferView, pixelFormat, pixelDatatype, width, height) {
    if (height === 1) {
      return bufferView;
    }
    var flipped = PixelFormat.createTypedArray(
      pixelFormat,
      pixelDatatype,
      width,
      height
    );
    var numberOfComponents = PixelFormat.componentsLength(pixelFormat);
    var textureWidth = width * numberOfComponents;
    for (var i = 0; i < height; ++i) {
      var row = i * height * numberOfComponents;
      var flippedRow = (height - i - 1) * height * numberOfComponents;
      for (var j = 0; j < textureWidth; ++j) {
        flipped[flippedRow + j] = bufferView[row + j];
      }
    }
    return flipped;
  },
};
export default Object.freeze(PixelFormat);
