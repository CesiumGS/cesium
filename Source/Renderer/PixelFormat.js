/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PixelFormat
     */
    var PixelFormat = {
        /**
         * A pixel format containing a depth value.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1902
         */
        DEPTH_COMPONENT : new Enumeration(0x1902, 'DEPTH_COMPONENT'),

        /**
         * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8_WEBGL}.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x84F9
         */
        DEPTH_STENCIL : new Enumeration(0x84F9, 'DEPTH_STENCIL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1906
         */
        ALPHA : new Enumeration(0x1906, 'ALPHA'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1907
         */
        RGB : new Enumeration(0x1907, 'RGB'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1908
         */
        RGBA : new Enumeration(0x1908, 'RGBA'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1909
         */
        LUMINANCE : new Enumeration(0x1909, 'LUMINANCE'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x190A
         */
        LUMINANCE_ALPHA : new Enumeration(0x190A, 'LUMINANCE_ALPHA'),

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
