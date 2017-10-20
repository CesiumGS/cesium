define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * @private
     */
    var TextureWrap = {
        CLAMP_TO_EDGE : WebGLConstants.CLAMP_TO_EDGE,
        REPEAT : WebGLConstants.REPEAT,
        MIRRORED_REPEAT : WebGLConstants.MIRRORED_REPEAT,

        validate : function(textureWrap) {
            return ((textureWrap === TextureWrap.CLAMP_TO_EDGE) ||
                    (textureWrap === TextureWrap.REPEAT) ||
                    (textureWrap === TextureWrap.MIRRORED_REPEAT));
        }
    };

    return freezeObject(TextureWrap);
});
