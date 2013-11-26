/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureWrap
     */
    var TextureWrap = {
        /**
         * 0x812F.  Clamps texture coordinates to the normalized range [0, 1].
         *
         * @type {Number}
         * @constant
         */
        CLAMP_TO_EDGE : 0x812F,

        /**
         * 0x2901.  Repeats texture coordinates outside the normalized range [0, 1] by ignoring the integer part.
         *
         * @type {Number}
         * @constant
         */
        REPEAT : 0x2901,

        /**
         * 0x8370.  Mirror repeats texture coordinates outside the normalized range [0, 1], using the
         * integer part of the texture coordinate if it is even, or 1.0 minus the fractional part if it is odd.
         *
         * @type {Number}
         * @constant
         */
        MIRRORED_REPEAT : 0x8370,

        /**
         * DOC_TBA
         *
         * @param {TextureWrap} textureWrap
         *
         * @returns {Boolean}
         */
        validate : function(textureWrap) {
            return ((textureWrap === TextureWrap.CLAMP_TO_EDGE) ||
                    (textureWrap === TextureWrap.REPEAT) ||
                    (textureWrap === TextureWrap.MIRRORED_REPEAT));
        }
    };

    return TextureWrap;
});
