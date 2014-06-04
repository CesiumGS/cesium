/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        defaultValue,
        defineProperties,
        destroyObject,
        DeveloperError) {
    "use strict";

    /**
     * @private
     */
    var Buffer = function(gl, bufferTarget, sizeInBytes, usage, buffer) {
        this._gl = gl;
        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        this._buffer = buffer;
        this.vertexArrayDestroyable = true;
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