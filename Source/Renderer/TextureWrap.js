import freezeObject from '../Core/freezeObject.js';
import WebGLConstants from '../Core/WebGLConstants.js';

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
export default freezeObject(TextureWrap);
