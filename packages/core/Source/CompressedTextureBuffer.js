import defined from "./defined.js";

/**
 * Describes a compressed texture and contains a compressed texture buffer.
 * @alias CompressedTextureBuffer
 * @constructor
 *
 * @param {PixelFormat} internalFormat The pixel format of the compressed texture.
 * @param {PixelDatatype} pixelDatatype The pixel datatype of the compressed texture.
 * @param {number} width The width of the texture.
 * @param {number} height The height of the texture.
 * @param {Uint8Array} buffer The compressed texture buffer.
 */
function CompressedTextureBuffer(
  internalFormat,
  pixelDatatype,
  width,
  height,
  buffer,
) {
  this._format = internalFormat;
  this._datatype = pixelDatatype;
  this._width = width;
  this._height = height;
  this._buffer = buffer;
}

Object.defineProperties(CompressedTextureBuffer.prototype, {
  /**
   * The format of the compressed texture.
   * @type {PixelFormat}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  internalFormat: {
    get: function () {
      return this._format;
    },
  },
  /**
   * The datatype of the compressed texture.
   * @type {PixelDatatype}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  pixelDatatype: {
    get: function () {
      return this._datatype;
    },
  },
  /**
   * The width of the texture.
   * @type {number}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  width: {
    get: function () {
      return this._width;
    },
  },
  /**
   * The height of the texture.
   * @type {number}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  height: {
    get: function () {
      return this._height;
    },
  },
  /**
   * The compressed texture buffer.
   * @type {Uint8Array}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  bufferView: {
    get: function () {
      return this._buffer;
    },
  },
  /**
   * The compressed texture buffer. Alias for bufferView.
   * @type {Uint8Array}
   * @readonly
   * @memberof CompressedTextureBuffer.prototype
   */
  arrayBufferView: {
    get: function () {
      return this._buffer;
    },
  },
});

/**
 * Creates a shallow clone of a compressed texture buffer.
 *
 * @param {CompressedTextureBuffer} object The compressed texture buffer to be cloned.
 * @return {CompressedTextureBuffer} A shallow clone of the compressed texture buffer.
 */
CompressedTextureBuffer.clone = function (object) {
  if (!defined(object)) {
    return undefined;
  }

  return new CompressedTextureBuffer(
    object._format,
    object._datatype,
    object._width,
    object._height,
    object._buffer,
  );
};

/**
 * Creates a shallow clone of this compressed texture buffer.
 *
 * @return {CompressedTextureBuffer} A shallow clone of the compressed texture buffer.
 */
CompressedTextureBuffer.prototype.clone = function () {
  return CompressedTextureBuffer.clone(this);
};
export default CompressedTextureBuffer;
