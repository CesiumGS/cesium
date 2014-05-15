/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * @private
     */
    var RenderbufferFormat = {
        RGBA4 : new Enumeration(0x8056, 'RGBA4'),
        RGB5_A1 : new Enumeration(0x8057, 'RGB5_A1'),
        RGB565 : new Enumeration(0x8D62, 'RGB565'),
        DEPTH_COMPONENT16 : new Enumeration(0x81A5, 'DEPTH_COMPONENT16'),
        STENCIL_INDEX8 : new Enumeration(0x8D48, 'STENCIL_INDEX8'),
        DEPTH_STENCIL : new Enumeration(0x84F9, 'DEPTH_STENCIL'),

        validate : function(renderbufferFormat) {
            return ((renderbufferFormat === RenderbufferFormat.RGBA4) ||
                    (renderbufferFormat === RenderbufferFormat.RGB5_A1) ||
                    (renderbufferFormat === RenderbufferFormat.RGB565) ||
                    (renderbufferFormat === RenderbufferFormat.DEPTH_COMPONENT16) ||
                    (renderbufferFormat === RenderbufferFormat.STENCIL_INDEX8) ||
                    (renderbufferFormat === RenderbufferFormat.DEPTH_STENCIL));
        }
    };

    return RenderbufferFormat;
});
