/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureMinificationFilter
     */
    var TextureMinificationFilter = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NEAREST : new Enumeration(0x2600, 'NEAREST'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINEAR : new Enumeration(0x2601, 'LINEAR'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NEAREST_MIPMAP_NEAREST : new Enumeration(0x2700, 'NEAREST_MIPMAP_NEAREST'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINEAR_MIPMAP_NEAREST : new Enumeration(0x2701, 'LINEAR_MIPMAP_NEAREST'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NEAREST_MIPMAP_LINEAR : new Enumeration(0x2702, 'NEAREST_MIPMAP_LINEAR'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINEAR_MIPMAP_LINEAR : new Enumeration(0x2703, 'LINEAR_MIPMAP_LINEAR'),

        /**
         * DOC_TBA
         *
         * @param textureMinificationFilter
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