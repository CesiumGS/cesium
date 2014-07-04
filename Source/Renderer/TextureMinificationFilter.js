/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var TextureMinificationFilter = {
        NEAREST : 0x2600,
        LINEAR : 0x2601,
        NEAREST_MIPMAP_NEAREST : 0x2700,
        LINEAR_MIPMAP_NEAREST : 0x2701,
        NEAREST_MIPMAP_LINEAR : 0x2702,
        LINEAR_MIPMAP_LINEAR : 0x2703,

        validate : function(textureMinificationFilter) {
            return ((textureMinificationFilter === TextureMinificationFilter.NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR));
        }
    };

    return freezeObject(TextureMinificationFilter);
});
