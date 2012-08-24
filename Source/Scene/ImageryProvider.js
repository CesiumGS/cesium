/*global define*/
define([
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Renderer/MipmapHint',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './ImageryState',
        '../ThirdParty/when'
    ], function(
        loadImage,
        DeveloperError,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        ImageryState,
        when) {
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
     * This default implementation of createResources uses a projection property to
     * transform the image property on the tile imagery to WGS84 and stores it in
     * the transformedImage property.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Imagery} imagery The imagery to transform.
     */
    ImageryProvider.prototype.transformImagery = function(context, imagery) {
        imagery.transformedImage = this.projection.toWgs84(imagery.extent, imagery.image);
        imagery.image = undefined;
        imagery.state = ImageryState.TRANSFORMED;
    };

    /**
     * Create WebGL resources for the tile imagery using whatever data the transformImagery step produced.
     * Once complete, the tile imagery state should be set to READY.  Alternatively, tile imagery state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * This default implementation of createResources creates a texture from the transformedImage
     * property on the tile imagery.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Imagery} imagery The imagery to create resources for.
     * @param {TexturePool} texturePool A texture pool to use to create textures.
     */
    ImageryProvider.prototype.createResources = function(context, imagery, texturePool) {
        imagery.texture = ImageryProvider.createTextureFromTransformedImage(context, imagery.transformedImage, texturePool);
        imagery.transformedImage = undefined;
        imagery.state = ImageryState.READY;
    };

    ImageryProvider.loadImageAndCheckDiscardPolicy = function(url, discardPolicy) {
        var image = loadImage(url);

        if (typeof discardPolicy === 'undefined') {
            return image;
        }

        return when(discardPolicy.shouldDiscardImage(image), function(shouldDiscard) {
            return shouldDiscard ? undefined : image;
        });
    };

    ImageryProvider.createTextureFromTransformedImage = function(context, transformedImage, texturePool) {
        var texture = texturePool.createTexture2D(context, {
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