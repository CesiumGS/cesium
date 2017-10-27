define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * Enumerates all possible filters used when magnifying WebGL textures, which takes places when zooming
     * into imagery. Provides the possible values for the {@link ImageryLayer#magnificationFilter} property.
     *
     * @exports TextureMagnificationFilter
     *
     * @see TextureMinificationFilter
     * @see ImageryLayer#magnificationFilter
     */
    var TextureMagnificationFilter = {
        /**
         * Nearest neighbor sampling of image pixels to texture.
         *
         * @type {Number}
         * @constant
         */
        NEAREST : WebGLConstants.NEAREST,
        /**
         * Bi-linear interpolation of image pixels to texture.
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
