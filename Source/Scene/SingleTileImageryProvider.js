/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Extent',
        './Projections',
        './GeographicTilingScheme',
        './ImageryProvider',
        './ImageryState'
    ], function(
        defaultValue,
        loadImage,
        DeveloperError,
        Extent,
        Projections,
        GeographicTilingScheme,
        ImageryProvider,
        ImageryState) {
    "use strict";

    /**
     * Provides a single, top-level imagery tile.
     *
     * @alias SingleTileImageryProvider
     * @constructor
     *
     * @param {String} description.url The url for the tile.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent covered by the image.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} url is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    var SingleTileImageryProvider = function(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        this._url = description.url;
        this._proxy = description.proxy;
        this._maximumLevel = 0;
        this._tilingScheme = new GeographicTilingScheme({
            extent : defaultValue(description.extent, Extent.MAX_VALUE),
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });

        this._image = undefined;
        this._texture = undefined;

        this._ready = false;

        var that = this;
        this._image = loadImage(this._buildImageUrl()).then(function(image) {
            that._image = image;

            var tilingScheme = that._tilingScheme;
            var ellipsoid = tilingScheme.ellipsoid;
            var extent = tilingScheme.extent;

            tilingScheme.levelZeroMaximumGeometricError = ellipsoid.getRadii().x * (extent.east - extent.west) / image.width;

            that._ready = true;
        });
    };

    /**
     * Gets the URL of the ArcGIS MapServer.
     * @returns {String} The URL.
     */
    SingleTileImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    SingleTileImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    SingleTileImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    SingleTileImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    SingleTileImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    SingleTileImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.extent;
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.
     * By default, no tiles will be filtered.
     * @returns {TileDiscardPolicy} The discard policy.
     */
    SingleTileImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    SingleTileImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Gets an array containing the host names from which a particular tile image can
     * be requested.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Array} The host name(s) from which the tile can be requested.
     */
    SingleTileImageryProvider.prototype.getAvailableHostnames = function(x, y, level) {
        return undefined;
    };

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
    SingleTileImageryProvider.prototype._buildImageUrl = function(x, y, level) {
        var url = this._url;

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
    };

    /**
     * Request the image for a given tile.
     *
     * @param {String} url The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     */
    SingleTileImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        return this._image;
    };

    return SingleTileImageryProvider;
});