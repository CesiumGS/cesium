/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var RenderbufferFormat = {
        RGBA4 : 0x8056,
        RGB5_A1 : 0x8057,
        RGB565 : 0x8D62,
        DEPTH_COMPONENT16 : 0x81A5,
        STENCIL_INDEX8 : 0x8D48,
        DEPTH_STENCIL : 0x84F9,

        validate : function(renderbufferFormat) {
            return ((renderbufferFormat === RenderbufferFormat.RGBA4) ||
                    (renderbufferFormat === RenderbufferFormat.RGB5_A1) ||
                    (renderbufferFormat === RenderbufferFormat.RGB565) ||
                    (renderbufferFormat === RenderbufferFormat.DEPTH_COMPONENT16) ||
                    (renderbufferFormat === RenderbufferFormat.STENCIL_INDEX8) ||
                    (renderbufferFormat === RenderbufferFormat.DEPTH_STENCIL));
        }
    };

    return freezeObject(RenderbufferFormat);
});