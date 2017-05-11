/*global define*/
define([
        './defined',
        './defineProperties'
    ], function(
        defined,
        defineProperties
    ) {
    'use strict';

    /**
     * Describes a compressed texture and contains a compressed texture buffer.
     *
     * @param {PixelFormat} internalFormat The pixel format of the compressed texture.
     * @param {Number} width The width of the texture.
     * @param {Number} height The height of the texture.
     * @param {Uint8Array} buffer The compressed texture buffer.
     */
    function CompressedTextureBuffer(internalFormat, width, height, buffer) {
        this._format = internalFormat;
        this._width = width;
        this._height = height;
        this._buffer =  buffer;
    }

    defineProperties(CompressedTextureBuffer.prototype, {
        /**
         * The format of the compressed texture.
         * @type PixelFormat
         * @readonly
         */
        internalFormat : {
            get : function() {
                return this._format;
            }
        },
        /**
         * The width of the texture.
         * @type Number
         * @readonly
         */
        width : {
            get : function() {
                return this._width;
            }
        },
        /**
         * The height of the texture.
         * @type Number
         * @readonly
         */
        height : {
            get : function() {
                return this._height;
            }
        },
        /**
         * The compressed texture buffer.
         * @type Uint8Array
         * @readonly
         */
        bufferView : {
            get : function() {
                return this._buffer;
            }
        }
    });

    /**
     * Creates a shallow clone of a compressed texture buffer.
     *
     * @param {CompressedTextureBuffer} object The compressed texture buffer to be cloned.
     * @return {CompressedTextureBuffer} A shallow clone of the compressed texture buffer.
     */
    CompressedTextureBuffer.clone = function(object) {
        if (!defined(object)) {
            return undefined;
        }

        return new CompressedTextureBuffer(object._format, object._width, object._height, object._buffer);
    };

    /**
     * Creates a shallow clone of this compressed texture buffer.
     *
     * @return {CompressedTextureBuffer} A shallow clone of the compressed texture buffer.
     */
    CompressedTextureBuffer.prototype.clone = function() {
        return CompressedTextureBuffer.clone(this);
    };

    return CompressedTextureBuffer;
});