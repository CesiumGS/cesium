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
     * @param {String} url The url for the tile.
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
    var SingleTileImageryProvider = function(url, description) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        description = defaultValue(description, {});

        this._url = url;
        this._proxy = description.proxy;

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @constant
         * @type {Extent}
         */
        this.extent = defaultValue(description.extent, Extent.MAX_VALUE);

        /**
         * The maximum level-of-detail that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.maxLevel = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;

        /**
         * The tiling scheme used by this provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            extent : this.extent,
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });

        this._image = undefined;
        this._texture = undefined;

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = false;

        var that = this;
        this._image = loadImage(this.buildImageUrl()).then(function(image) {
            that._image = image;

            var tilingScheme = that.tilingScheme;
            var ellipsoid = tilingScheme.ellipsoid;
            var extent = that.extent;

            tilingScheme.levelZeroMaximumGeometricError = ellipsoid.getRadii().x * (extent.east - extent.west) / image.width;

            that.ready = true;
        });
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
    SingleTileImageryProvider.prototype.buildImageUrl = function(x, y, level) {
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
    SingleTileImageryProvider.prototype.requestImage = function(url) {
        return this._image;
    };

    return SingleTileImageryProvider;
});