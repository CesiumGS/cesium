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
     * Gets an array containing the host names from which a particular tile image can
     * be requested.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Array} The host name(s) from which the tile can be requested.
     */
    ImageryProvider.prototype.getAvailableHostnames = function(x, y, level) {
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