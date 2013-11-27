/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PixelFormat
     */
    var PixelFormat = {
        /**
         * 0x1902.  A pixel format containing a depth value.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_COMPONENT : 0x1902,

        /**
         * 0x84F9.  A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8_WEBGL}.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_STENCIL : 0x84F9,

        /**
         * 0x1906.  A pixel format containing an alpha channel.
         *
         * @type {Number}
         * @constant
         */
        ALPHA : 0x1906,

        /**
         * 0x1907.  A pixel format containing red, green, and blue channels.
         *
         * @type {Number}
         * @constant
         */
        RGB : 0x1907,

        /**
         * 0x1908.  A pixel format containing red, green, blue, and alpha channels.
         *
         * @type {Number}
         * @constant
         */
        RGBA : 0x1908,

        /**
         * 0x1909.  A pixel format containing a luminance (intensity) channel.
         *
         * @type {Number}
         * @constant
         */
        LUMINANCE : 0x1909,

        /**
         * 0x190A.  A pixel format containing luminance (intensity) and alpha channels.
         *
         * @type {Number}
         * @constant
         * @default 0x190A
         */
        LUMINANCE_ALPHA : 0x190A,

        /**
         * Returns true if the pixel format is a valid enumeration value.
         *
         * @param {PixelFormat} pixelFormat The pixel format to test.
         *
         * @returns {Boolean} Returns true if the pixel format is a valid enumeration value; otherwise, false.
         */
        validate : function(pixelFormat) {
            return ((pixelFormat === PixelFormat.DEPTH_COMPONENT) ||
                    (pixelFormat === PixelFormat.DEPTH_STENCIL) ||
                    (pixelFormat === PixelFormat.ALPHA) ||
                    (pixelFormat === PixelFormat.RGB) ||
                    (pixelFormat === PixelFormat.RGBA) ||
                    (pixelFormat === PixelFormat.LUMINANCE) ||
                    (pixelFormat === PixelFormat.LUMINANCE_ALPHA));
        },

        /**
         * Returns true if the pixel format is a color format.
         *
         * @param {PixelFormat} pixelFormat The pixel format to test.
         *
         * @returns {Boolean} Returns true if the pixel format is a color format; otherwise false.
         */
        isColorFormat : function(pixelFormat) {
            return ((pixelFormat === PixelFormat.ALPHA) ||
                    (pixelFormat === PixelFormat.RGB) ||
                    (pixelFormat === PixelFormat.RGBA) ||
                    (pixelFormat === PixelFormat.LUMINANCE) ||
                    (pixelFormat === PixelFormat.LUMINANCE_ALPHA));
        },

        /**
         * Returns true if the pixel format is a depth format.
         *
         * @param {PixelFormat} pixelFormat The pixel format to test.
         *
         * @returns {Boolean} Returns true if the pixel format is a depth format; otherwise false.
         */
        isDepthFormat : function(pixelFormat) {
            return ((pixelFormat === PixelFormat.DEPTH_COMPONENT) ||
                    (pixelFormat === PixelFormat.DEPTH_STENCIL));
        }
    };

    return PixelFormat;
});
