/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/loadImage',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/Math',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './Projections',
        './TileState',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        loadImage,
        writeTextToCanvas,
        DeveloperError,
        Cartesian2,
        Extent,
        CesiumMath,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        Projections,
        TileState,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery hosted by an ArcGIS server.
     *
     * @alias ArcGisMapServerImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS MapServer service.
     * @param {String|Object} [description.discardPolicy] If the service returns "missing" tiles,
     *        these can be filtered out by providing an object which is expected to have a
     *        shouldDiscardImage function.  By default, no tiles will be filtered.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var esri = new ArcGisMapServerImageryProvider({
     *     url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    var ArcGisMapServerImageryProvider = function(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        /**
         * The URL of the ArcGIS MapServer.
         * @type {String}
         */
        this.url = description.url;

        /**
         * If the service returns "missing" tiles, these can be filtered out by providing
         * an object which is expected to have a shouldDiscardImage function.  By default,
         * no tiles will be filtered.
         */
        this.discardPolicy = description.discardPolicy;

        this._proxy = description.proxy;

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @type {Extent}
         */
        this.extent = undefined;

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = undefined;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = undefined;

        /**
         * The maximum level-of-detail that can be requested.
         *
         * @type {Number}
         */
        this.maxLevel = undefined;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = undefined;

        /**
         * The tiling scheme used by this provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = undefined;

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = false;

        this._logo = undefined;

        // Grab the details of this MapServer.
        var metadata = jsonp(this.url, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        });

        var that = this;
        this._isReady = when(metadata, function(data) {
            var tileInfo = data.tileInfo;

            that.tileWidth = tileInfo.rows;
            that.tileHeight = tileInfo.cols;

            if (tileInfo.spatialReference.wkid === 102100) {
                var levelZeroResolution = tileInfo.lods[0].resolution;
                var rows = tileInfo.rows;
                var cols = tileInfo.cols;
                var west = tileInfo.origin.x;
                var north = tileInfo.origin.y;
                var east = west + levelZeroResolution * cols;
                var south = north - levelZeroResolution * rows;

                that.projection = Projections.MERCATOR;
                that.tilingScheme = new WebMercatorTilingScheme(/*{
                    extentSouthwestInMeters : new Cartesian2(west, south),
                    extentNortheastInMeters : new Cartesian2(east, north)
                }*/);
                that.extent = that.tilingScheme.extent;
            } else if (data.tileInfo.spatialReference.wkid === 4326) {
                that.projection = Projections.WGS84;
                that.extent = new Extent(CesiumMath.toRadians(data.fullExtent.xmin),
                                         CesiumMath.toRadians(data.fullExtent.ymin),
                                         CesiumMath.toRadians(data.fullExtent.xmax),
                                         CesiumMath.toRadians(data.fullExtent.ymax));
                that.tilingScheme = new GeographicTilingScheme({
                    extent : that.extent
                });
            }

            that.maxLevel = data.tileInfo.lods.length - 1;

            // Create the copyright message.
            that._logo = writeTextToCanvas(data.copyrightText, {
                font : '12px sans-serif'
            });

            that.ready = true;

            return true;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    };

    /**
     * Creates a {@link DiscardMissingTileImagePolicy} that compares tiles
     * against the tile at coordinate (0, 0), at the maximum level of detail, which is
     * assumed to be missing.  Only a subset of the pixels are compared to improve performance.
     * These pixels were chosen based on the current visual appearance of the tile on the ESRI servers at
     * <a href="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/0/0">http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/19/0/0</a>.
     *
     * Before using this discard policy, check to make sure that the ArcGIS service actually has
     * missing tiles.  In particular, overlay maps may just provide fully transparent tiles, in
     * which case no discard policy is necessary.
     */
    ArcGisMapServerImageryProvider.prototype.createDiscardMissingTilePolicy = function() {
        var that = this;
        var missingTileUrl = when(this._isReady, function() {
            return that.buildImageUrl(0, 0, that.maxLevel);
        });
        var pixelsToCheck = [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)];

        return new DiscardMissingTileImagePolicy(missingTileUrl, pixelsToCheck);
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
    ArcGisMapServerImageryProvider.prototype.buildImageUrl = function(x, y, level) {
        var url = this.url + '/tile/' + level + '/' + y + '/' + x;

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
    ArcGisMapServerImageryProvider.prototype.requestImage = function(url) {
        return ImageryProvider.loadImageAndCheckDiscardPolicy(url, this.discardPolicy);
    };

    /**
     * DOC_TBA
     * @memberof ArcGisMapServerImageryProvider
     */
    ArcGisMapServerImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return ArcGisMapServerImageryProvider;
});