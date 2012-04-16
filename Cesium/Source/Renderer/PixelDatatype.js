/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PixelDatatype
     */
    var PixelDatatype = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_BYTE : new Enumeration(0x1401, "UNSIGNED_BYTE"), // UNSIGNED_BYTE

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_SHORT_4_4_4_4 : new Enumeration(0x8033, "UNSIGNED_SHORT_4_4_4_4"), // UNSIGNED_SHORT_4_4_4_4

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_SHORT_5_5_5_1 : new Enumeration(0x8034, "UNSIGNED_SHORT_5_5_5_1"), // UNSIGNED_SHORT_5_5_5_1

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_SHORT_5_6_5 : new Enumeration(0x8363, "UNSIGNED_SHORT_5_6_5") // UNSIGNED_SHORT_5_6_5
    };

    return PixelDatatype;
});