define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * Enumerates all possible filters used when magnifying WebGL textures.
     *
     * @exports TextureMagnificationFilter
     *
     * @see TextureMinificationFilter
     */
    var TextureMagnificationFilter = {
        /**
         * Samples the texture by returning the closest pixel.
         *
         * @type {Number}
         * @constant
         */
        NEAREST : WebGLConstants.NEAREST,
        /**
         * Samples the texture through bi-linear interpolation of the four nearest pixels. This produces smoother results than <code>NEAREST</code> filtering.
         *
         * @type {Number}
         * @constant
         */
        LINEAR : WebGLConstants.LINEAR,

        /**
         * Validates the given <code>textureMinificationFilter</code> with respect to the possible enum values.
         *
         * @private
         *
         * @param textureMagnificationFilter
         * @returns {Boolean} <code>true</code> if <code>textureMagnificationFilter</code> is valid.
         */
        validate : function(textureMagnificationFilter) {
            return ((textureMagnificationFilter === TextureMagnificationFilter.NEAREST) ||
                    (textureMagnificationFilter === TextureMagnificationFilter.LINEAR));
        }
    };

    return freezeObject(TextureMagnificationFilter);
});
