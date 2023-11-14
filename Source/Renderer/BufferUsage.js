import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 */
const BufferUsage = {
  STREAM_DRAW: WebGLConstants.STREAM_DRAW,
  STATIC_DRAW: WebGLConstants.STATIC_DRAW,
  DYNAMIC_DRAW: WebGLConstants.DYNAMIC_DRAW,

  validate: function (bufferUsage) {
    return (
      bufferUsage === BufferUsage.STREAM_DRAW ||
      bufferUsage === BufferUsage.STATIC_DRAW ||
      bufferUsage === BufferUsage.DYNAMIC_DRAW
    );
  },
};
export default Object.freeze(BufferUsage);
