/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/IndexDatatype',
        './BufferUsage',
        './WebGLConstants'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        IndexDatatype,
        BufferUsage,
        WebGLConstants) {
    "use strict";

    /**
     * @private
     */
    function Buffer(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.context)) {
            throw new DeveloperError('options.context is required.');
        }

        if (!defined(options.typedArray) && !defined(options.sizeInBytes)) {
            throw new DeveloperError('Either options.sizeInBytes or options.typedArray is required.');
        }

        if (defined(options.typedArray) && defined(options.sizeInBytes)) {
            throw new DeveloperError('Cannot pass in both options.sizeInBytes and options.typedArray.');
        }

        if (defined(options.typedArray) && !(typeof options.typedArray === 'object' && typeof options.typedArray.byteLength === 'number')) {
            throw new DeveloperError('options.typedArray must be a typed array');
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
        if (sizeInBytes <= 0) {
            throw new DeveloperError('Buffer size must be greater than zero.');
        }
        //>>includeEnd('debug');

        var buffer = gl.createBuffer();
        gl.bindBuffer(bufferTarget, buffer);
        gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
        gl.bindBuffer(bufferTarget, null);

        this._gl = gl;
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
        if (!defined(options.context)) {
            throw new DeveloperError('options.context is required.');
        }
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
     * @param {IndexDatatype} indexDatatype The datatype of indices in the buffer.
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
        if (!defined(options.context)) {
            throw new DeveloperError('options.context is required.');
        }

        if (!IndexDatatype.validate(options.indexDatatype)) {
            throw new DeveloperError('Invalid indexDatatype.');
        }

        if ((options.indexDatatype === IndexDatatype.UNSIGNED_INT) && !options.context.elementIndexUint) {
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
