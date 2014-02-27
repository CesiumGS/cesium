/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/destroyObject'
    ], function(
        DeveloperError,
        defaultValue,
        destroyObject) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Buffer
     * @internalConstructor
     *
     * @see Context#createVertexBuffer
     * @see Context#createIndexBuffer
     */
    var Buffer = function(gl, bufferTarget, sizeInBytes, usage, buffer) {
        this._gl = gl;
        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._buffer = buffer;
        this._vertexArrayDestroyable = true;
    };

    /**
     * DOC_TBA
     * DOC_TBA: arrayView
     *
     * @memberof Buffer
     * @param {Number} [offsetInBytes=0] DOC_TBA
     *
     * @exception {DeveloperError} This buffer is not large enough.
     * @exception {DeveloperError} This buffer was destroyed, i.e., destroy() was called.
     */
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

    Buffer.prototype._getBuffer = function() {
        return this._buffer;
    };

    /**
     * DOC_TBA
     * @memberof Buffer
     *
     * @returns {Number} DOC_TBA
     * @exception {DeveloperError} This buffer was destroyed, i.e., destroy() was called.
     */
    Buffer.prototype.getSizeInBytes = function() {
        return this._sizeInBytes;
    };

    /**
     * DOC_TBA
     * @memberof Buffer
     *
     * @returns {GLenum} DOC_TBA
     * @exception {DeveloperError} This buffer was destroyed, i.e., destroy() was called.
     */
    Buffer.prototype.getUsage = function() {
        return this._usage;
    };

    /**
     * DOC_TBA
     * @memberof Buffer
     */
    Buffer.prototype.getVertexArrayDestroyable = function() {
        return this._vertexArrayDestroyable;
    };

    /**
     * DOC_TBA
     * @memberof Buffer
     */
    Buffer.prototype.setVertexArrayDestroyable = function(value) {
        this._vertexArrayDestroyable = value;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Buffer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Buffer#destroy
     */
    Buffer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Buffer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This buffer was destroyed, i.e., destroy() was called.
     *
     * @see Buffer#isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteBuffers.xml'>glDeleteBuffers</a>
     *
     * @example
     * buffer = buffer && buffer.destroy();
     */
    Buffer.prototype.destroy = function() {
        this._gl.deleteBuffer(this._buffer);
        return destroyObject(this);
    };

    return Buffer;
});