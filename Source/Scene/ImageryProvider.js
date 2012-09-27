/*global define*/
define([
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/throttleRequestByServer',
        '../ThirdParty/when'
    ], function(
        loadImage,
        DeveloperError,
        throttleRequestByServer,
        when) {
    "use strict";

    /**
     * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias ImageryProvider
     * @constructor
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see SingleTileImageryProvider
     * @see WebMapServiceImageryProvider
     */
    function ImageryProvider() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    ImageryProvider.prototype.isReady = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    ImageryProvider.prototype.getExtent = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    ImageryProvider.prototype.getTileWidth = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    ImageryProvider.prototype.getTileHeight = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    ImageryProvider.prototype.getMaximumLevel = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    ImageryProvider.prototype.getTilingScheme = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.
     * @returns {TileDiscardPolicy} The discard policy.
     */
    ImageryProvider.prototype.getTileDiscardPolicy = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Requests the image for a given tile.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @return {Promise} A promise for the image that will resolve when the image is available, or
     *         undefined if there are too many active requests to the server, and the request
     *         should be retried later.  If the resulting image is not suitable for display,
     *         the promise can resolve to undefined.  The resolved image may be either an
     *         Image or a Canvas DOM object.
     */
    ImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    ImageryProvider.loadImage = function(url) {
        return throttleRequestByServer(url, loadImage);
    };

    return ImageryProvider;
});