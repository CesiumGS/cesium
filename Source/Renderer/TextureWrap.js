/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var TextureWrap = {
        CLAMP_TO_EDGE : 0x812F,
        REPEAT : 0x2901,
        MIRRORED_REPEAT : 0x8370,

        validate : function(textureWrap) {
            return ((textureWrap === TextureWrap.CLAMP_TO_EDGE) ||
                    (textureWrap === TextureWrap.REPEAT) ||
                    (textureWrap === TextureWrap.MIRRORED_REPEAT));
        }
    };

    return freezeObject(TextureWrap);
});
