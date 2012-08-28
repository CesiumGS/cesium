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

    ImageryProvider.loadImageAndCheckDiscardPolicy = function(url, discardPolicy) {
        var image = loadImage(url);

        if (typeof discardPolicy === 'undefined') {
            return image;
        }

        return when(discardPolicy.shouldDiscardImage(image), function(shouldDiscard) {
            return shouldDiscard ? undefined : image;
        });
    };

    return ImageryProvider;
});