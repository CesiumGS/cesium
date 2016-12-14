/*global define*/
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
    var RenderbufferFormat = {
        RGBA4 : WebGLConstants.RGBA4,
        RGB5_A1 : WebGLConstants.RGB5_A1,
        RGB565 : WebGLConstants.RGB565,
        DEPTH_COMPONENT16 : WebGLConstants.DEPTH_COMPONENT16,
        STENCIL_INDEX8 : WebGLConstants.STENCIL_INDEX8,
        DEPTH_STENCIL : WebGLConstants.DEPTH_STENCIL,

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
