/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureMinificationFilter
     */
    var TextureMinificationFilter = {
        /**
         * 0x2600.  Nearest minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        NEAREST : 0x2600,

        /**
         * 0x2601.  Linear (bilinear for 2D textures) minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        LINEAR : 0x2601,

        /**
         * 0x2700.  Nearest-mipmap-nearest minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        NEAREST_MIPMAP_NEAREST : 0x2700,

        /**
         * 0x2701.  Linear-mipmap-nearest minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        LINEAR_MIPMAP_NEAREST : 0x2701,

        /**
         * 0x2702.  Nearest-mipmap-linear minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        NEAREST_MIPMAP_LINEAR : 0x2702,

        /**
         * 0x2703.  Linear-mipmap-linear minification texture filtering.
         *
         * @type {Number}
         * @constant
         */
        LINEAR_MIPMAP_LINEAR : 0x2703,

        /**
         * DOC_TBA
         *
         * @param {TextureMinificationFilter} textureMinificationFilter
         *
         * @returns {Boolean}
         */
        validate : function(textureMinificationFilter) {
            return ((textureMinificationFilter === TextureMinificationFilter.NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR));
        }
    };

    return TextureMinificationFilter;
});
