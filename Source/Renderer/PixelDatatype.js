/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PixelDatatype
     */
    var PixelDatatype = {
        /**
         * 0x1401. 8-bit unsigned byte.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_BYTE : 0x1401,

        /**
         * 0x1403. An unsigned short pixel datatype used for depth textures with 16-bit depth values.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT : 0x1403,

        /**
         * 0x1405. An unsigned int pixel datatype used for depth textures with 32-bit depth values.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_INT : 0x1405,

        /**
         * 0x1406. 32-bit floating-point.
         *
         * @type {Number}
         * @constant
         */
        FLOAT : 0x1406,

        /**
         * 0x84FA. An unsigned int pixel datatype used for depth-stencil textures with 24-bit depth and 8-bit stencil values.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_INT_24_8_WEBGL : 0x84FA,

        /**
         * 0x8033. An unsigned short pixel datatype with 4 bytes for each R, G, B, and A component.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT_4_4_4_4 : 0x8033,

        /**
         * 0x8034. An unsigned short pixel datatype with 5 bits for R, G, and B components, and 1 byte for A.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT_5_5_5_1 : 0x8034,

        /**
         * 0x8363. An unsigned short pixel datatype with 5 bits for R, 6 for G, and 5 for B.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT_5_6_5 : 0x8363,

        /**
         * DOC_TBA
         *
         * @param {PixelDatatype} pixelDatatype
         *
         * @returns {Boolean}
         */
        validate : function(pixelDatatype) {
            return ((pixelDatatype === PixelDatatype.UNSIGNED_BYTE) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_INT) ||
                    (pixelDatatype === PixelDatatype.FLOAT) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8_WEBGL) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5));
        }
    };

    return PixelDatatype;
});
