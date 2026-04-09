// @ts-check

import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * @private
 * @enum {number}
 */
const BufferUsage = {
  STREAM_DRAW: WebGLConstants.STREAM_DRAW,
  STATIC_DRAW: WebGLConstants.STATIC_DRAW,
  DYNAMIC_DRAW: WebGLConstants.DYNAMIC_DRAW,
  DYNAMIC_READ: WebGLConstants.DYNAMIC_READ,
};

/**
 * @private
 * @param {BufferUsage} bufferUsage
 */
// @ts-expect-error TODO: Move utilities off enums.
BufferUsage.validate = function (bufferUsage) {
  return (
    bufferUsage === BufferUsage.STREAM_DRAW ||
    bufferUsage === BufferUsage.STATIC_DRAW ||
    bufferUsage === BufferUsage.DYNAMIC_DRAW ||
    bufferUsage === BufferUsage.DYNAMIC_READ
  );
};

Object.freeze(BufferUsage);

export default BufferUsage;
