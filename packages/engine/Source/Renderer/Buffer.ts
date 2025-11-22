import Check from "../Core/Check.js";
import createGuid from "../Core/createGuid.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import BufferUsage from "./BufferUsage.js";

/**
 * @private
 */
function Buffer(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  ;

  const gl = options.context._gl;
  const bufferTarget = options.bufferTarget;
  const typedArray = options.typedArray;
  let sizeInBytes = options.sizeInBytes;
  const usage = options.usage;
  const hasArray = defined(typedArray);

  if (hasArray) {
    sizeInBytes = typedArray.byteLength;
  }

  ;

  const buffer = gl.createBuffer();
  gl.bindBuffer(bufferTarget, buffer);
  gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
  gl.bindBuffer(bufferTarget, null);

  this._id = createGuid();
  this._gl = gl;
  this._webgl2 = options.context._webgl2;
  this._bufferTarget = bufferTarget;
  this._sizeInBytes = sizeInBytes;
  this._usage = usage;
  this._buffer = buffer;
  this.vertexArrayDestroyable = true;
}

Buffer.createPixelBuffer = function (options) {
  ;

  if (!options.context._webgl2) {
    throw new DeveloperError(
      "A WebGL 2 context is required to create PixelBuffers.",
    );
  }

  return new Buffer({
    context: options.context,
    bufferTarget: WebGLConstants.PIXEL_PACK_BUFFER,
    typedArray: options.typedArray,
    sizeInBytes: options.sizeInBytes,
    usage: options.usage,
  });
};

/**
 * Creates a vertex buffer, which contains untyped vertex data in GPU-controlled memory.
 * <br /><br />
 * A vertex array defines the actual makeup of a vertex, e.g., positions, normals, texture coordinates,
 * etc., by interpreting the raw data in one or more vertex buffers.
 *
 * @param {object} options An object containing the following properties:
 * @param {Context} options.context The context in which to create the buffer
 * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
 * @param {number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
 * @param {BufferUsage} options.usage Specifies the expected usage pattern of the buffer. On some GL implementations, this can significantly affect performance. See {@link BufferUsage}.
 * @returns {VertexBuffer} The vertex buffer, ready to be attached to a vertex array.
 *
 * @exception {DeveloperError} Must specify either <options.typedArray> or <options.sizeInBytes>, but not both.
 * @exception {DeveloperError} The buffer size must be greater than zero.
 * @exception {DeveloperError} Invalid <code>usage</code>.
 *
 *
 * @example
 * // Example 1. Create a dynamic vertex buffer 16 bytes in size.
 * const buffer = Buffer.createVertexBuffer({
 *     context : context,
 *     sizeInBytes : 16,
 *     usage : BufferUsage.DYNAMIC_DRAW
 * });
 *
 * @example
 * // Example 2. Create a dynamic vertex buffer from three floating-point values.
 * // The data copied to the vertex buffer is considered raw bytes until it is
 * // interpreted as vertices using a vertex array.
 * const positionBuffer = buffer.createVertexBuffer({
 *     context : context,
 *     typedArray : new Float32Array([0, 0, 0]),
 *     usage : BufferUsage.STATIC_DRAW
 * });
 *
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ARRAY_BUFFER</code>
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ARRAY_BUFFER</code>
 */
Buffer.createVertexBuffer = function (options) {
  ;

  return new Buffer({
    context: options.context,
    bufferTarget: WebGLConstants.ARRAY_BUFFER,
    typedArray: options.typedArray,
    sizeInBytes: options.sizeInBytes,
    usage: options.usage,
  });
};

/**
 * Creates an index buffer, which contains typed indices in GPU-controlled memory.
 * <br /><br />
 * An index buffer can be attached to a vertex array to select vertices for rendering.
 * <code>Context.draw</code> can render using the entire index buffer or a subset
 * of the index buffer defined by an offset and count.
 *
 * @param {object} options An object containing the following properties:
 * @param {Context} options.context The context in which to create the buffer
 * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
 * @param {number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
 * @param {BufferUsage} options.usage Specifies the expected usage pattern of the buffer. On some GL implementations, this can significantly affect performance. See {@link BufferUsage}.
 * @param {IndexDatatype} options.indexDatatype The datatype of indices in the buffer.
 * @returns {IndexBuffer} The index buffer, ready to be attached to a vertex array.
 *
 * @exception {DeveloperError} Must specify either <options.typedArray> or <options.sizeInBytes>, but not both.
 * @exception {DeveloperError} IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system. Check context.elementIndexUint.
 * @exception {DeveloperError} The size in bytes must be greater than zero.
 * @exception {DeveloperError} Invalid <code>usage</code>.
 * @exception {DeveloperError} Invalid <code>indexDatatype</code>.
 *
 *
 * @example
 * // Example 1. Create a stream index buffer of unsigned shorts that is
 * // 16 bytes in size.
 * const buffer = Buffer.createIndexBuffer({
 *     context : context,
 *     sizeInBytes : 16,
 *     usage : BufferUsage.STREAM_DRAW,
 *     indexDatatype : IndexDatatype.UNSIGNED_SHORT
 * });
 *
 * @example
 * // Example 2. Create a static index buffer containing three unsigned shorts.
 * const buffer = Buffer.createIndexBuffer({
 *     context : context,
 *     typedArray : new Uint16Array([0, 1, 2]),
 *     usage : BufferUsage.STATIC_DRAW,
 *     indexDatatype : IndexDatatype.UNSIGNED_SHORT
 * });
 *
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ELEMENT_ARRAY_BUFFER</code>
 * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ELEMENT_ARRAY_BUFFER</code>
 */
Buffer.createIndexBuffer = function (options) {
  ;

  const context = options.context;
  const indexDatatype = options.indexDatatype;

  const bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype);
  const buffer = new Buffer({
    context: context,
    bufferTarget: WebGLConstants.ELEMENT_ARRAY_BUFFER,
    typedArray: options.typedArray,
    sizeInBytes: options.sizeInBytes,
    usage: options.usage,
  });

  const numberOfIndices = buffer.sizeInBytes / bytesPerIndex;

  Object.defineProperties(buffer, {
    indexDatatype: {
      get: function () {
        return indexDatatype;
      },
    },
    bytesPerIndex: {
      get: function () {
        return bytesPerIndex;
      },
    },
    numberOfIndices: {
      get: function () {
        return numberOfIndices;
      },
    },
  });

  return buffer;
};

Object.defineProperties(Buffer.prototype, {
  sizeInBytes: {
    get: function () {
      return this._sizeInBytes;
    },
  },

  usage: {
    get: function () {
      return this._usage;
    },
  },
});

Buffer.prototype._getBuffer = function () {
  return this._buffer;
};

Buffer.prototype._bind = function () {
  const gl = this._gl;
  const target = this._bufferTarget;
  gl.bindBuffer(target, this._buffer);
};

Buffer.prototype._unBind = function () {
  const gl = this._gl;
  const target = this._bufferTarget;
  gl.bindBuffer(target, null);
};

Buffer.prototype.copyFromArrayView = function (arrayView, offsetInBytes) {
  offsetInBytes = offsetInBytes ?? 0;

  ;

  const gl = this._gl;
  const target = this._bufferTarget;
  gl.bindBuffer(target, this._buffer);
  gl.bufferSubData(target, offsetInBytes, arrayView);
  gl.bindBuffer(target, null);
};

Buffer.prototype.copyFromBuffer = function (
  readBuffer,
  readOffset,
  writeOffset,
  sizeInBytes,
) {
  ;

  const readTarget = WebGLConstants.COPY_READ_BUFFER;
  const writeTarget = WebGLConstants.COPY_WRITE_BUFFER;

  const gl = this._gl;
  gl.bindBuffer(writeTarget, this._buffer);
  gl.bindBuffer(readTarget, readBuffer._buffer);
  gl.copyBufferSubData(
    readTarget,
    writeTarget,
    readOffset,
    writeOffset,
    sizeInBytes,
  );
  gl.bindBuffer(writeTarget, null);
  gl.bindBuffer(readTarget, null);
};

Buffer.prototype.getBufferData = function (
  arrayView,
  sourceOffset,
  destinationOffset,
  length,
) {
  sourceOffset = sourceOffset ?? 0;
  destinationOffset = destinationOffset ?? 0;

  ;

  const gl = this._gl;
  const target = WebGLConstants.COPY_READ_BUFFER;
  gl.bindBuffer(target, this._buffer);
  gl.getBufferSubData(
    target,
    sourceOffset,
    arrayView,
    destinationOffset,
    length,
  );
  gl.bindBuffer(target, null);
};

Buffer.prototype.isDestroyed = function () {
  return false;
};

Buffer.prototype.destroy = function () {
  this._gl.deleteBuffer(this._buffer);
  return destroyObject(this);
};
export { Buffer };
export default Buffer;
