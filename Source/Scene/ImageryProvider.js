/*global define*/
define([
        '../Core/DeveloperError',
        '../Renderer/MipmapHint',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        DeveloperError,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias ImageryProvider
     * @constructor
     */
    function ImageryProvider() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @param {Number} x The x coordinate of the tile.
     * @param {Number} y The y coordinate of the tile.
     * @param {Number} level The level-of-detail of the tile.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    ImageryProvider.prototype.buildImageUrl = function(x, y, level) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Request the image for a given tile.
     *
     * @param {String} url The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     */
    ImageryProvider.prototype.requestImage = function(url) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Transform the tile imagery from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile imagery
     * state should be set to TRANSFORMED.  Alternatively, tile imagery state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {TileImagery} tileImagery The tile imagery to transform.
     */
    ImageryProvider.prototype.transformImagery = function(context, tileImagery) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Create WebGL resources for the tile imagery using whatever data the transformImagery step produced.
     * Once complete, the tile imagery state should be set to READY.  Alternatively, tile imagery state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {TileImagery} tileImagery The tile imagery to create resources for.
     */
    ImageryProvider.prototype.createResources = function(context, tileImagery) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    ImageryProvider.createTextureFromTransformedImage = function(context, transformedImage) {
        var texture = context.createTexture2D({
            source : transformedImage
        });

        texture.generateMipmap(MipmapHint.NICEST);
        texture.setSampler({
            wrapS : TextureWrap.CLAMP,
            wrapT : TextureWrap.CLAMP,
            minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR,

            // TODO: Remove Chrome work around
            maximumAnisotropy : context.getMaximumTextureFilterAnisotropy() || 8
        });

        return texture;
    };

    return ImageryProvider;
});