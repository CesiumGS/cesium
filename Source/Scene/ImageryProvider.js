/*global define*/
define([
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/throttleRequestByServer'
    ], function(
        loadImage,
        DeveloperError,
        throttleRequestByServer) {
    "use strict";

    /**
     * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias ImageryProvider
     * @constructor
     *
     * @see ArcGisMapServerImageryProvider
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers.html">Cesium Sandcastle Imagery Layers Demo</a>
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html">Cesium Sandcastle Imagery Manipulation Demo</a>
     */
    var ImageryProvider = function ImageryProvider() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    ImageryProvider.prototype.isReady = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getExtent = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTileWidth = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTileHeight = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @returns {Number} The maximum level, or undefined if there is no maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getMaximumLevel = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTilingScheme = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @memberof ImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getTileDiscardPolicy = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof ImageryProvider
     *
     * @returns {Event} The event.
     */
    ImageryProvider.prototype.getErrorEvent = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @memberof ImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.getLogo = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Gets the proxy used by this provider.
     *
     * @memberof ImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    ImageryProvider.prototype.getProxy = function() {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ImageryProvider#isReady} returns true.
     *
     * @memberof ImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    ImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        throw new DeveloperError('This type should not be instantiated directly.');
    };

    /**
     * Loads an image from a given URL.  If the server referenced by the URL already has
     * too many requests pending, this function will instead return undefined, indicating
     * that the request should be retried later.
     *
     * @memberof ImageryProvider
     *
     * @param url {String} The URL of the image.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    ImageryProvider.loadImage = function(url) {
        return throttleRequestByServer(url, loadImage);
    };

    return ImageryProvider;
});