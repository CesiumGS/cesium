import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * 指定数据存储区的使用方式
 * @namespace
 * @private
 */
var BufferUsage = {
  /**
   * 流数据，保存在GPU中，适合一次写入，一次使用的情况
   * @constant
   */
  STREAM_DRAW: WebGLConstants.STREAM_DRAW,
  /**
   * 静态数据，保存在GPU中，适合一次写入，不再更改，多次使用的情况
   * @constant
   */
  STATIC_DRAW: WebGLConstants.STATIC_DRAW,
  /**
   * 动态数据，保存在内存中，适合多次写入，多次使用的情况
   * @constant
   */
  DYNAMIC_DRAW: WebGLConstants.DYNAMIC_DRAW,
  /**
   * 验证bufferUsage是否为BufferUsage中的某一种类型
   * @param {*} bufferUsage 待验证的数据
   * @returns 合法则返回true，否则返回false
   */
  validate: function (bufferUsage) {
    return (
      bufferUsage === BufferUsage.STREAM_DRAW ||
      bufferUsage === BufferUsage.STATIC_DRAW ||
      bufferUsage === BufferUsage.DYNAMIC_DRAW
    );
  },
};
export default Object.freeze(BufferUsage);
