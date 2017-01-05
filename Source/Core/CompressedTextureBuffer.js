/*global define*/
define([
        './defineProperties'
    ], function(
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

    return CompressedTextureBuffer;
});