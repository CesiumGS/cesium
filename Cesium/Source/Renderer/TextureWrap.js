/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureWrap
     */
    var TextureWrap = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        CLAMP : new Enumeration(0x812F, "CLAMP"), // CLAMP_TO_EDGE

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        REPEAT : new Enumeration(0x2901, "REPEAT"), // REPEAT

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        MIRRORED_REPEAT : new Enumeration(0x8370, "MIRRORED_REPEAT") // MIRRORED_REPEAT
    };

    return TextureWrap;
});