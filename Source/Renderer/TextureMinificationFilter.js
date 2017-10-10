define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * Enumerates all possible filters used when minifying WebGL textures, which takes places when zooming
     * out of imagery. Provides the possible values for the {@link ImageryLayer#minificationFilter} property.
     *
     * @alias TextureMinificationFilter
     *
     * @see TextureMagnificationFilter
     * @see ImageryLayer#minificationFilter
     */
    var TextureMinificationFilter = {
        /**
         * Nearest neighbor sampling of image pixels to texture.
         */
        NEAREST : WebGLConstants.NEAREST,
        /**
         * Bi-linear interpolation of image pixels to texture.
         */
        LINEAR : WebGLConstants.LINEAR,
        /**
         * WebGL <code>NEAREST_MIPMAP_NEAREST</code> interpolation of image pixels to texture.
         */
        NEAREST_MIPMAP_NEAREST : WebGLConstants.NEAREST_MIPMAP_NEAREST,
        /**
         * WebGL <code>LINEAR_MIPMAP_NEAREST</code> interpolation of image pixels to texture.
         */
        LINEAR_MIPMAP_NEAREST : WebGLConstants.LINEAR_MIPMAP_NEAREST,
        /**
         * WebGL <code>NEAREST_MIPMAP_LINEAR</code> interpolation of image pixels to texture.
         */
        NEAREST_MIPMAP_LINEAR : WebGLConstants.NEAREST_MIPMAP_LINEAR,
        /**
         * WebGL <code>LINEAR_MIPMAP_LINEAR</code> interpolation of image pixels to texture.
         */
        LINEAR_MIPMAP_LINEAR : WebGLConstants.LINEAR_MIPMAP_LINEAR,

        /**
         * Validates the given <code>textureMinificationFilter</code> with respect to the possible enum values.
         *
         * @param textureMinificationFilter
         * @returns {boolean} <code>true</code> if <code>textureMinificationFilter</code> is valid.
         */
        validate : function(textureMinificationFilter) {
            return ((textureMinificationFilter === TextureMinificationFilter.NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST) ||
                    (textureMinificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR) ||
                    (textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR));
        }
    };

    return freezeObject(TextureMinificationFilter);
});
