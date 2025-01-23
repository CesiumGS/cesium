import defined from "./defined.js";

/**
 * Describes a compressed texture and contains a compressed texture buffer.
 */
class CompressedTextureBuffer {
  /**
   * Create a texture buffer
   *
   * @param {PixelFormat} internalFormat The pixel format of the compressed texture.
   * @param {PixelDatatype} pixelDatatype The pixel datatype of the compressed texture.
   * @param {number} width The width of the texture.
   * @param {number} height The height of the texture.
   * @param {Uint8Array} buffer The compressed texture buffer.
   */
  constructor(internalFormat, pixelDatatype, width, height, buffer) {
    this._format = internalFormat;
    this._datatype = pixelDatatype;
    this._width = width;
    this._height = height;
    this._buffer = buffer;
  }
  /**
   * The format of the compressed texture.
   * @type {PixelFormat}
   * @readonly
   */
  get internalFormat() {
    return this._format;
  }

  /**
   * The datatype of the compressed texture.
   * @type {PixelDatatype}
   * @readonly
   */
  get pixelDatatype() {
    return this._datatype;
  }

  /**
   * The width of the texture.
   * @type {number}
   * @readonly
   */
  get width() {
    return this._width;
  }

  /**
   * The height of the texture.
   * @type {number}
   * @readonly
   */
  get height() {
    return this._height;
  }

  /**
   * The compressed texture buffer.
   * @type {Uint8Array}
   * @readonly
   */
  get bufferView() {
    return this._buffer;
  }

  /**
   * The compressed texture buffer. Alias for bufferView.
   * @type {Uint8Array}
   * @readonly
   */
  get arrayBufferView() {
    return this._buffer;
  }

  /**
   * Creates a shallow clone of a compressed texture buffer.
   *
   * @param {CompressedTextureBuffer} object The compressed texture buffer to be cloned.
   * @return {CompressedTextureBuffer | undefined} A shallow clone of the compressed texture buffer.
   */
  static clone(object) {
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
  }

  /**
   * Creates a shallow clone of this compressed texture buffer.
   *
   * @return {CompressedTextureBuffer} A shallow clone of the compressed texture buffer.
   */
  clone() {
    return CompressedTextureBuffer.clone(this);
  }
}

export default CompressedTextureBuffer;
