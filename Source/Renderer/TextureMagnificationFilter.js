/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureMagnificationFilter
     */
    var TextureMagnificationFilter = {
        /**
         * 0x2600.  Nearest magnification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        NEAREST : 0x2600,

        /**
         * 0x2601.  Linear (bilinear for 2D textures) magnification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        LINEAR : 0x2601,

        /**
         * DOC_TBA
         *
         * @param {TextureMagnificationFilter} textureMagnificationFilter
         *
         * @returns {Boolean}
         */
        validate : function(textureMagnificationFilter) {
            return ((textureMagnificationFilter === TextureMagnificationFilter.NEAREST) ||
                    (textureMagnificationFilter === TextureMagnificationFilter.LINEAR));
        }
    };

    return TextureMagnificationFilter;
});
