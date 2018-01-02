define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        '../Core/WebGLConstants',
        './BufferUsage'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        IndexDatatype,
        WebGLConstants,
        BufferUsage) {
    'use strict';

    /**
     * @private
     */
    function Buffer(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);

        if (!defined(options.typedArray) && !defined(options.sizeInBytes)) {
            throw new DeveloperError('Either options.sizeInBytes or options.typedArray is required.');
        }

        if (defined(options.typedArray) && defined(options.sizeInBytes)) {
            throw new DeveloperError('Cannot pass in both options.sizeInBytes and options.typedArray.');
        }

        if (defined(options.typedArray)) {
            Check.typeOf.object('options.typedArray', options.typedArray);
            Check.typeOf.number('options.typedArray.byteLength', options.typedArray.byteLength);
        }

        if (!BufferUsage.validate(options.usage)) {
            throw new DeveloperError('usage is invalid.');
        }
        //>>includeEnd('debug');

        var gl = options.context._gl;
        var bufferTarget = options.bufferTarget;
        var typedArray = options.typedArray;
        var sizeInBytes = options.sizeInBytes;
        var usage = options.usage;
        var hasArray = defined(typedArray);

        if (hasArray) {
            sizeInBytes = typedArray.byteLength;
        }

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThan('sizeInBytes', sizeInBytes, 0);
        //>>includeEnd('debug');

        var buffer = gl.createBuffer();
        gl.bindBuffer(bufferTarget, buffer);
        gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
        gl.bindBuffer(bufferTarget, null);

        this._gl = gl;
        this._webgl2 = options.context._webgl2;
        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._buffer = buffer;
        this.vertexArrayDestroyable = true;
    }

    /**
     * Creates a vertex buffer, which contains untyped vertex data in GPU-controlled memory.
     * <br /><br />
     * A vertex array defines the actual makeup of a vertex, e.g., positions, normals, texture coordinates,
     * etc., by interpreting the raw data in one or more vertex buffers.
     *
     * @param {Object} options An object containing the following properties:
     * @param {Context} options.context The context in which to create the buffer
     * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
     * @param {Number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
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
     * var buffer = Buffer.createVertexBuffer({
     *     context : context,
     *     sizeInBytes : 16,
     *     usage : BufferUsage.DYNAMIC_DRAW
     * });
     *
     * @example
     * // Example 2. Create a dynamic vertex buffer from three floating-point values.
     * // The data copied to the vertex buffer is considered raw bytes until it is
     * // interpreted as vertices using a vertex array.
     * var positionBuffer = buffer.createVertexBuffer({
     *     context : context,
     *     typedArray : new Float32Array([0, 0, 0]),
     *     usage : BufferUsage.STATIC_DRAW
     * });
     *
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ARRAY_BUFFER</code>
     */
    Buffer.createVertexBuffer = function(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);
        //>>includeEnd('debug');

        return new Buffer({
            context: options.context,
            bufferTarget: WebGLConstants.ARRAY_BUFFER,
            typedArray: options.typedArray,
            sizeInBytes: options.sizeInBytes,
            usage: options.usage
        });
    };

    /**
     * Creates an index buffer, which contains typed indices in GPU-controlled memory.
     * <br /><br />
     * An index buffer can be attached to a vertex array to select vertices for rendering.
     * <code>Context.draw</code> can render using the entire index buffer or a subset
     * of the index buffer defined by an offset and count.
     *
     * @param {Object} options An object containing the following properties:
     * @param {Context} options.context The context in which to create the buffer
     * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
     * @param {Number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
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
     * var buffer = Buffer.createIndexBuffer({
     *     context : context,
     *     sizeInBytes : 16,
     *     usage : BufferUsage.STREAM_DRAW,
     *     indexDatatype : IndexDatatype.UNSIGNED_SHORT
     * });
     *
     * @example
     * // Example 2. Create a static index buffer containing three unsigned shorts.
     * var buffer = Buffer.createIndexBuffer({
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
    Buffer.createIndexBuffer = function(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);

        if (!IndexDatatype.validate(options.indexDatatype)) {
            throw new DeveloperError('Invalid indexDatatype.');
        }

        if (options.indexDatatype === IndexDatatype.UNSIGNED_INT && !options.context.elementIndexUint) {
            throw new DeveloperError('IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.  Check context.elementIndexUint.');
        }
        //>>includeEnd('debug');

        var context = options.context;
        var indexDatatype = options.indexDatatype;

        var bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype);
        var buffer = new Buffer({
            context : context,
            bufferTarget : WebGLConstants.ELEMENT_ARRAY_BUFFER,
            typedArray : options.typedArray,
            sizeInBytes : options.sizeInBytes,
            usage : options.usage
        });

        var numberOfIndices = buffer.sizeInBytes / bytesPerIndex;

        defineProperties(buffer, {
            indexDatatype: {
                get : function() {
                    return indexDatatype;
                }
            },
            bytesPerIndex : {
                get : function() {
                    return bytesPerIndex;
                }
            },
            numberOfIndices : {
                get : function() {
                    return numberOfIndices;
                }
            }
        });

        return buffer;
    };

    defineProperties(Buffer.prototype, {
        sizeInBytes : {
            get : function() {
                return this._sizeInBytes;
            }
        },

        usage: {
            get : function() {
                return this._usage;
            }
        }
    });

    Buffer.prototype._getBuffer = function() {
        return this._buffer;
    };

    Buffer.prototype.copyFromArrayView = function(arrayView, offsetInBytes) {
        offsetInBytes = defaultValue(offsetInBytes, 0);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('arrayView', arrayView);
        Check.typeOf.number.lessThanOrEquals('offsetInBytes + arrayView.byteLength', offsetInBytes + arrayView.byteLength, this._sizeInBytes);
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._bufferTarget;
        gl.bindBuffer(target, this._buffer);
        gl.bufferSubData(target, offsetInBytes, arrayView);
        gl.bindBuffer(target, null);
    };

    Buffer.prototype.copyFromBuffer = function(readBuffer, readOffset, writeOffset, sizeInBytes) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._webgl2) {
            throw new DeveloperError('A WebGL 2 context is required.');
        }
        if (!defined(readBuffer)) {
            throw new DeveloperError('readBuffer must be defined.');
        }
        if (!defined(sizeInBytes) || sizeInBytes <= 0) {
            throw new DeveloperError('sizeInBytes must be defined and be greater than zero.');
        }
        if (!defined(readOffset) || readOffset < 0 || readOffset + sizeInBytes > readBuffer._sizeInBytes) {
            throw new DeveloperError('readOffset must be greater than or equal to zero and readOffset + sizeInBytes must be less than of equal to readBuffer.sizeInBytes.');
        }
        if (!defined(writeOffset) || writeOffset < 0 || writeOffset + sizeInBytes > this._sizeInBytes) {
            throw new DeveloperError('writeOffset must be greater than or equal to zero and writeOffset + sizeInBytes must be less than of equal to this.sizeInBytes.');
        }
        if (this._buffer === readBuffer._buffer && ((writeOffset >= readOffset && writeOffset < readOffset + sizeInBytes) || (readOffset > writeOffset && readOffset < writeOffset + sizeInBytes))) {
            throw new DeveloperError('When readBuffer is equal to this, the ranges [readOffset + sizeInBytes) and [writeOffset, writeOffset + sizeInBytes) must not overlap.');
        }
        if ((this._bufferTarget === WebGLConstants.ELEMENT_ARRAY_BUFFER && readBuffer._bufferTarget !== WebGLConstants.ELEMENT_ARRAY_BUFFER) ||
            (this._bufferTarget !== WebGLConstants.ELEMENT_ARRAY_BUFFER && readBuffer._bufferTarget === WebGLConstants.ELEMENT_ARRAY_BUFFER)) {
            throw new DeveloperError('Can not copy an index buffer into another buffer type.');
        }
        //>>includeEnd('debug');

        var readTarget = WebGLConstants.COPY_READ_BUFFER;
        var writeTarget = WebGLConstants.COPY_WRITE_BUFFER;

        var gl = this._gl;
        gl.bindBuffer(writeTarget, this._buffer);
        gl.bindBuffer(readTarget, readBuffer._buffer);
        gl.copyBufferSubData(readTarget, writeTarget, readOffset, writeOffset, sizeInBytes);
        gl.bindBuffer(writeTarget, null);
        gl.bindBuffer(readTarget, null);
    };

    Buffer.prototype.getBufferData = function(arrayView, sourceOffset, destinationOffset, length) {
        sourceOffset = defaultValue(sourceOffset, 0);
        destinationOffset = defaultValue(destinationOffset, 0);

        //>>includeStart('debug', pragmas.debug);
        if (!this._webgl2) {
            throw new DeveloperError('A WebGL 2 context is required.');
        }
        if (!defined(arrayView)) {
            throw new DeveloperError('arrayView is required.');
        }

        var copyLength;
        var elementSize;
        var arrayLength = arrayView.byteLength;
        if (!defined(length)) {
            if (defined(arrayLength)) {
                copyLength = arrayLength - destinationOffset;
                elementSize = 1;
            } else {
                arrayLength = arrayView.length;
                copyLength = arrayLength - destinationOffset;
                elementSize = arrayView.BYTES_PER_ELEMENT;
            }
        } else {
            copyLength = length;
            if (defined(arrayLength)) {
                elementSize = 1;
            } else {
                arrayLength = arrayView.length;
                elementSize = arrayView.BYTES_PER_ELEMENT;
            }
        }

        if (destinationOffset < 0 || destinationOffset > arrayLength) {
            throw new DeveloperError('destinationOffset must be greater than zero and less than the arrayView length.');
        }
        if (destinationOffset + copyLength > arrayLength) {
            throw new DeveloperError('destinationOffset + length must be less than or equal to the arrayViewLength.');
        }
        if (sourceOffset < 0 || sourceOffset > this._sizeInBytes) {
            throw new DeveloperError('sourceOffset must be greater than zero and less than the buffers size.');
        }
        if (sourceOffset + copyLength * elementSize > this._sizeInBytes) {
            throw new DeveloperError('sourceOffset + length must be less than the buffers size.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = WebGLConstants.COPY_READ_BUFFER;
        gl.bindBuffer(target, this._buffer);
        gl.getBufferSubData(target, sourceOffset, arrayView, destinationOffset, length);
        gl.bindBuffer(target, null);
    };

    Buffer.prototype.isDestroyed = function() {
        return false;
    };

    Buffer.prototype.destroy = function() {
        this._gl.deleteBuffer(this._buffer);
        return destroyObject(this);
    };

    return Buffer;
});
