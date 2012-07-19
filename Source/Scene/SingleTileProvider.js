/*global define*/
define([
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        './Projections',
        './WebMercatorTilingScheme',
        './TileState',
        './ImageryProvider'
    ], function(
        loadImage,
        DeveloperError,
        Extent,
        CesiumMath,
        Projections,
        WebMercatorTilingScheme,
        TileState,
        ImageryProvider) {
    "use strict";

    /**
     * Provides a single, top-level tile.
     *
     * @alias SingleTileProvider
     * @constructor
     *
     * @param {String} url The url for the tile.
     * @param {Object} [proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} url is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    var SingleTileProvider = function(url, extent, proxy) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        this._url = url;
        this._proxy = proxy;

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @constant
         * @type {Extent}
         */
        this.extent = extent;

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
        this.projection = Projections.MERCATOR;

        /**
         * The tiling scheme used by this tile provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new WebMercatorTilingScheme({
            numberOfLevelZeroTilesX: 1,
            numberOfLevelZeroTilesY: 1
        });

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;
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
    SingleTileProvider.prototype.buildImageUrl = function(x, y, level) {
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
    SingleTileProvider.prototype.requestImage = function(url) {
        return loadImage(url, false);
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
    SingleTileProvider.prototype.transformImagery = function(context, tileImagery) {
        tileImagery.transformedImage = tileImagery.image;
        tileImagery.image = undefined;
        tileImagery.state = TileState.TRANSFORMED;
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
    SingleTileProvider.prototype.createResources = function(context, tileImagery) {
        tileImagery.texture = ImageryProvider.createTextureFromTransformedImage(context, tileImagery.transformedImage);
        tileImagery.transformedImage = undefined;
        tileImagery.state = TileState.READY;
    };

    return SingleTileProvider;
});