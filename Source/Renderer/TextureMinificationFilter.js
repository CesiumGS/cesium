/*global define*/
define([
        '../Core/freezeObject',
        './WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    "use strict";

    /**
     * @private
     */
    var TextureMinificationFilter = {
        NEAREST : WebGLConstants.NEAREST,
        LINEAR : WebGLConstants.LINEAR,
        NEAREST_MIPMAP_NEAREST : WebGLConstants.NEAREST_MIPMAP_NEAREST,
        LINEAR_MIPMAP_NEAREST : WebGLConstants.LINEAR_MIPMAP_NEAREST,
        NEAREST_MIPMAP_LINEAR : WebGLConstants.NEAREST_MIPMAP_LINEAR,
        LINEAR_MIPMAP_LINEAR : WebGLConstants.LINEAR_MIPMAP_LINEAR,

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
