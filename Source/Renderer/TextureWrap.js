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
        CLAMP : new Enumeration(0x812F, 'CLAMP'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        REPEAT : new Enumeration(0x2901, 'REPEAT'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        MIRRORED_REPEAT : new Enumeration(0x8370, 'MIRRORED_REPEAT'),

        /**
         * DOC_TBA
         *
         * @param textureWrap
         *
         * @returns {Boolean}
         */
        validate : function(textureWrap) {
            return ((textureWrap === TextureWrap.CLAMP) ||
                    (textureWrap === TextureWrap.REPEAT) ||
                    (textureWrap === TextureWrap.MIRRORED_REPEAT));
        }
    };

    return TextureWrap;
});