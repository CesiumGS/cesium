/*global define*/
define(function() {
    "use strict";

    /**
     * The status of a framebuffer object.
     *
     * @exports FramebufferStatus
     */
    var FramebufferStatus = {
        /**
         * 0x8CD5.  The framebuffer is complete and ready for rendering.
         *
         * @type {Number}
         * @constant
         */
        COMPLETE : 0x8CD5,

        /**
         * 0x8CD6.  At least one attachment point with a renderbuffer or texture attached has its attached object no longer in existence or has an attached image with a width or height of zero,
         * or the color attachment point has a non-color-renderable image attached, or the depth attachment point has a non-depth-renderable image attached, or the stencil attachment point
         * has a non-stencil-renderable image attached.  Color-renderable formats include GL_RGBA4, GL_RGB5_A1, and GL_RGB565. GL_DEPTH_COMPONENT16 is the only depth-renderable format.
         * GL_STENCIL_INDEX8 is the only stencil-renderable format.
         *
         * @type {Number}
         * @constant
         */
        INCOMPLETE_ATTACHMENT : 0x8CD6,

        /**
         * 0x8CD7. No images are attached to the framebuffer.
         *
         * @type {Number}
         * @constant
         */
        INCOMPLETE_MISSING_ATTACHMENT : 0x8CD7,

        /**
         * 0x8CD9. Not all attached images have the same width and height.
         *
         * @type {Number}
         * @constant
         */
        INCOMPLETE_DIMENSIONS : 0x8CD9,

        /**
         * 0x8CDD. The combination of internal formats of the attached images violates an implementation-dependent set of restrictions.
         *
         * @type {Number}
         * @constant
         */
        UNSUPPORTED : 0x8CDD
    };

    return FramebufferStatus;
});
