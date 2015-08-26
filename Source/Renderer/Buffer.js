/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        './BufferUsage'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        IndexDatatype,
        BufferUsage) {
    "use strict";

    /**
     * @private
     */
    var Buffer = function(context, bufferTarget, typedArrayOrSizeInBytes, usage) {
        var gl = context._gl;
        var sizeInBytes;

        if (typeof typedArrayOrSizeInBytes === 'number') {
            sizeInBytes = typedArrayOrSizeInBytes;
        } else if (typeof typedArrayOrSizeInBytes === 'object' && typeof typedArrayOrSizeInBytes.byteLength === 'number') {
            sizeInBytes = typedArrayOrSizeInBytes.byteLength;
        } else {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('typedArrayOrSizeInBytes must be either a typed array or a number.');
            //>>includeEnd('debug');
        }

        //>>includeStart('debug', pragmas.debug);
        if (sizeInBytes <= 0) {
            throw new DeveloperError('typedArrayOrSizeInBytes must be greater than zero.');
        }

        if (!BufferUsage.validate(usage)) {
            throw new DeveloperError('usage is invalid.');
        }
        //>>includeEnd('debug');

        var buffer = gl.createBuffer();
        gl.bindBuffer(bufferTarget, buffer);
        gl.bufferData(bufferTarget, typedArrayOrSizeInBytes, usage);
        gl.bindBuffer(bufferTarget, null);

        this._gl = gl;
        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._buffer = buffer;
        this.vertexArrayDestroyable = true;
    };

    /**
     * Creates a vertex buffer, which contains untyped vertex data in GPU-controlled memory.
     * <br /><br />
     * A vertex array defines the actual makeup of a vertex, e.g., positions, normals, texture coordinates,
     * etc., by interpreting the raw data in one or more vertex buffers.
     *
     * @param {Context} context The context in which to create the buffer
     * @param {ArrayBufferView|Number} typedArrayOrSizeInBytes A typed array containing the data to copy to the buffer, or a <code>Number</code> defining the size of the buffer in bytes.
     * @param {BufferUsage} usage Specifies the expected usage pattern of the buffer.  On some GL implementations, this can significantly affect performance.  See {@link BufferUsage}.
     * @returns {VertexBuffer} The vertex buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} The size in bytes must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     *
     * @see Buffer#createIndexBuffer
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ARRAY_BUFFER</code>
     *
     * @example
     * // Example 1. Create a dynamic vertex buffer 16 bytes in size.
     * var buffer = Buffer.createVertexBuffer(context, 16, BufferUsage.DYNAMIC_DRAW);
     *
     * @example
     * // Example 2. Create a dynamic vertex buffer from three floating-point values.
     * // The data copied to the vertex buffer is considered raw bytes until it is
     * // interpreted as vertices using a vertex array.
     * var positionBuffer = buffer.createVertexBuffer(context, new Float32Array([0, 0, 0]),
     *     BufferUsage.STATIC_DRAW);
     */
    Buffer.createVertexBuffer = function(context, typedArrayOrSizeInBytes, usage) {
        return new Buffer(context, context._gl.ARRAY_BUFFER, typedArrayOrSizeInBytes, usage);
    };

    /**
     * Creates an index buffer, which contains typed indices in GPU-controlled memory.
     * <br /><br />
     * An index buffer can be attached to a vertex array to select vertices for rendering.
     * <code>Context.draw</code> can render using the entire index buffer or a subset
     * of the index buffer defined by an offset and count.
     *
     * @param {Context} context The context in which to create the buffer
     * @param {ArrayBufferView|Number} typedArrayOrSizeInBytes A typed array containing the data to copy to the buffer, or a <code>Number</code> defining the size of the buffer in bytes.
     * @param {BufferUsage} usage Specifies the expected usage pattern of the buffer.  On some GL implementations, this can significantly affect performance.  See {@link BufferUsage}.
     * @param {IndexDatatype} indexDatatype The datatype of indices in the buffer.
     * @returns {IndexBuffer} The index buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.    Check context.elementIndexUint.
     * @exception {DeveloperError} The size in bytes must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     * @exception {DeveloperError} Invalid <code>indexDatatype</code>.
     *
     * @see Buffer#createVertexBuffer
     * @see Context#draw
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ELEMENT_ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ELEMENT_ARRAY_BUFFER</code>
     *
     * @example
     * // Example 1. Create a stream index buffer of unsigned shorts that is
     * // 16 bytes in size.
     * var buffer = Buffer.createIndexBuffer(context, 16, BufferUsage.STREAM_DRAW,
     *     IndexDatatype.UNSIGNED_SHORT);
     *
     * @example
     * // Example 2. Create a static index buffer containing three unsigned shorts.
     * var buffer = Buffer.createIndexBuffer(context, new Uint16Array([0, 1, 2]),
     *     BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT)
     */
    Buffer.createIndexBuffer = function(context, typedArrayOrSizeInBytes, usage, indexDatatype) {
        //>>includeStart('debug', pragmas.debug);
        if (!IndexDatatype.validate(indexDatatype)) {
            throw new DeveloperError('Invalid indexDatatype.');
        }
        //>>includeEnd('debug');

        if ((indexDatatype === IndexDatatype.UNSIGNED_INT) && !context.elementIndexUint) {
            throw new DeveloperError('IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.  Check context.elementIndexUint.');
        }

        var bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype);
        var buffer = new Buffer(context, context._gl.ELEMENT_ARRAY_BUFFER, typedArrayOrSizeInBytes, usage);
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
        if (!arrayView) {
            throw new DeveloperError('arrayView is required.');
        }
        if (offsetInBytes + arrayView.byteLength > this._sizeInBytes) {
            throw new DeveloperError('This buffer is not large enough.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._bufferTarget;
        gl.bindBuffer(target, this._buffer);
        gl.bufferSubData(target, offsetInBytes, arrayView);
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