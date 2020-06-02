import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 */
var BufferUsage = {
  STREAM_DRAW: WebGLConstants.STREAM_DRAW, //流数据，保存在GPU中，适合一次写入，一次使用的情况
  STATIC_DRAW: WebGLConstants.STATIC_DRAW, //静态数据，保存在GPU中，适合一次写入，不再更改，多次使用的情况
  DYNAMIC_DRAW: WebGLConstants.DYNAMIC_DRAW, //动态数据，保存在内存中，适合多次写入，多次使用的情况

  validate: function (bufferUsage) {
    return (
      bufferUsage === BufferUsage.STREAM_DRAW ||
      bufferUsage === BufferUsage.STATIC_DRAW ||
      bufferUsage === BufferUsage.DYNAMIC_DRAW
    );
  },
};
export default Object.freeze(BufferUsage);
