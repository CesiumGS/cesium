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
     * @alias TextureMagnificationFilter
     *
     * @see TextureMinificationFilter
     * @see ImageryLayer#magnificationFilter
     */
    var TextureMagnificationFilter = {
        /**
         * Nearest neighbor sampling of image pixels to texture.
         */
        NEAREST : WebGLConstants.NEAREST,
        /**
         * Bi-linear interpolation of image pixels to texture.
         */
        LINEAR : WebGLConstants.LINEAR,

        /**
         * Validates the given <code>textureMinificationFilter</code> with respect to the possible enum values.
         *
         * @param textureMagnificationFilter
         * @returns {boolean} <code>true</code> if <code>textureMagnificationFilter</code> is valid.
         */
        validate : function(textureMagnificationFilter) {
            return ((textureMagnificationFilter === TextureMagnificationFilter.NEAREST) ||
                    (textureMagnificationFilter === TextureMagnificationFilter.LINEAR));
        }
    };

    return freezeObject(TextureMagnificationFilter);
});
