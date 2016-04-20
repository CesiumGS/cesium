/*global define*/
define([
        '../Renderer/WebGLConstants',
        './freezeObject'
    ], function(
        WebGLConstants,
        freezeObject) {
    'use strict';

    /**
     * The format of a pixel, i.e., the number of components it has and what they represent.
     *
     * @exports PixelFormat
     */
    var PixelFormat = {
        /**
         * A pixel format containing a depth value.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_COMPONENT : WebGLConstants.DEPTH_COMPONENT,

        /**
         * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_STENCIL : WebGLConstants.DEPTH_STENCIL,

        /**
         * A pixel format containing an alpha channel.
         *
         * @type {Number}
         * @constant
         */
        ALPHA : WebGLConstants.ALPHA,

        /**
         * A pixel format containing red, green, and blue channels.
         *
         * @type {Number}
         * @constant
         */
        RGB : WebGLConstants.RGB,

        /**
         * A pixel format containing red, green, blue, and alpha channels.
         *
         * @type {Number}
         * @constant
         */
        RGBA : WebGLConstants.RGBA,

        /**
         * A pixel format containing a luminance (intensity) channel.
         *
         * @type {Number}
         * @constant
         */
        LUMINANCE : WebGLConstants.LUMINANCE,

        /**
         * A pixel format containing luminance (intensity) and alpha channels.
         *
         * @type {Number}
         * @constant
         */
        LUMINANCE_ALPHA : WebGLConstants.LUMINANCE_ALPHA,

        /**
         * @private
         */
        validate : function(pixelFormat) {
            return pixelFormat === PixelFormat.DEPTH_COMPONENT ||
                   pixelFormat === PixelFormat.DEPTH_STENCIL ||
                   pixelFormat === PixelFormat.ALPHA ||
                   pixelFormat === PixelFormat.RGB ||
                   pixelFormat === PixelFormat.RGBA ||
                   pixelFormat === PixelFormat.LUMINANCE ||
                   pixelFormat === PixelFormat.LUMINANCE_ALPHA;
        },

        /**
         * @private
         */
        isColorFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.ALPHA ||
                   pixelFormat === PixelFormat.RGB ||
                   pixelFormat === PixelFormat.RGBA ||
                   pixelFormat === PixelFormat.LUMINANCE ||
                   pixelFormat === PixelFormat.LUMINANCE_ALPHA;
        },

        /**
         * @private
         */
        isDepthFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.DEPTH_COMPONENT ||
                   pixelFormat === PixelFormat.DEPTH_STENCIL;
        }
    };

    return freezeObject(PixelFormat);
});
