import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 */
var MipmapHint = {
  DONT_CARE: WebGLConstants.DONT_CARE,
  FASTEST: WebGLConstants.FASTEST,
  NICEST: WebGLConstants.NICEST,

  validate: function (mipmapHint) {
    return (
      mipmapHint === MipmapHint.DONT_CARE ||
      mipmapHint === MipmapHint.FASTEST ||
      mipmapHint === MipmapHint.NICEST
    );
  },
};
export default Object.freeze(MipmapHint);
