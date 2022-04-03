import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 */
const RenderbufferFormat = {
  RGBA4: WebGLConstants.RGBA4,
  RGBA8: WebGLConstants.RGBA8,
  RGBA16F: WebGLConstants.RGBA16F,
  RGBA32F: WebGLConstants.RGBA32F,
  RGB5_A1: WebGLConstants.RGB5_A1,
  RGB565: WebGLConstants.RGB565,
  DEPTH_COMPONENT16: WebGLConstants.DEPTH_COMPONENT16,
  STENCIL_INDEX8: WebGLConstants.STENCIL_INDEX8,
  DEPTH_STENCIL: WebGLConstants.DEPTH_STENCIL,
  DEPTH24_STENCIL8: WebGLConstants.DEPTH24_STENCIL8,

  validate: function (renderbufferFormat) {
    return (
      renderbufferFormat === RenderbufferFormat.RGBA4 ||
      renderbufferFormat === RenderbufferFormat.RGBA8 ||
      renderbufferFormat === RenderbufferFormat.RGBA16F ||
      renderbufferFormat === RenderbufferFormat.RGBA32F ||
      renderbufferFormat === RenderbufferFormat.RGB5_A1 ||
      renderbufferFormat === RenderbufferFormat.RGB565 ||
      renderbufferFormat === RenderbufferFormat.DEPTH_COMPONENT16 ||
      renderbufferFormat === RenderbufferFormat.STENCIL_INDEX8 ||
      renderbufferFormat === RenderbufferFormat.DEPTH_STENCIL ||
      renderbufferFormat === RenderbufferFormat.DEPTH24_STENCIL8
    );
  },

  getColorFormat: function (datatype) {
    if (datatype === WebGLConstants.FLOAT) {
      return RenderbufferFormat.RGBA32F;
    } else if (datatype === WebGLConstants.HALF_FLOAT_OES) {
      return RenderbufferFormat.RGBA16F;
    }
    return RenderbufferFormat.RGBA8;
  },
};
export default Object.freeze(RenderbufferFormat);
