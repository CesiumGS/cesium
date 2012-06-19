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
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DEPTH_COMPONENT : new Enumeration(0x1902, 'DEPTH_COMPONENT'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        ALPHA : new Enumeration(0x1906, 'ALPHA'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        RGB : new Enumeration(0x1907, 'RGB'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        RGBA : new Enumeration(0x1908, 'RGBA'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LUMINANCE : new Enumeration(0x1909, 'LUMINANCE'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LUMINANCE_ALPHA : new Enumeration(0x190A, 'LUMINANCE_ALPHA'),

        /**
         * DOC_TBA
         *
         * @param pixelFormat
         *
         * @returns {Boolean}
         */
        validate : function(pixelFormat) {
            return ((pixelFormat === PixelFormat.DEPTH_COMPONENT) ||
                    (pixelFormat === PixelFormat.ALPHA) ||
                    (pixelFormat === PixelFormat.RGB) ||
                    (pixelFormat === PixelFormat.RGBA) ||
                    (pixelFormat === PixelFormat.LUMINANCE) ||
                    (pixelFormat === PixelFormat.LUMINANCE_ALPHA));
        }
    };

    return PixelFormat;
});