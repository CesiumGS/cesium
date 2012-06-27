/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        '../Core/Extent',
        '../Core/Math',
        '../Core/jsonp',
        './Projections',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme',
        './DiscardMissingTileImagePolicy',
        '../ThirdParty/when',
        '../Core/Ellipsoid',
        '../Core/Cartographic2'
    ], function(
        defaultValue,
        loadImage,
        DeveloperError,
        Cartesian2,
        Extent,
        CesiumMath,
        jsonp,
        Projections,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        DiscardMissingTileImagePolicy,
        when,
        Ellipsoid,
        Cartographic2) {
    "use strict";

    /**
     * Provides tile images hosted by an ArcGIS Server.
     *
     * @name ArcGISMapServerTileProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS MapServer service.
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // ArcGIS World Street Maps tile provider
     * var esri = new ArcGISMapServerTileProvider({
     *     url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    function ArcGISMapServerTileProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        /**
         * The URL of the ArcGIS MapServer.
         * @type {String}
         */
        this.url = description.url;

        this._proxy = description.proxy;

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Extent}
         */
        this.maxExtent = undefined;

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
         * The maximum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMax = undefined;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = undefined;

        /**
         * The tiling scheme used by this tile provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = undefined;

        /**
         * True if the tile provider is ready for use; otherwise, false.
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
        var isReady = when(metadata, function(data) {
            // Grab tile details.
            that.tileWidth = data.tileInfo.rows;
            that.tileHeight = data.tileInfo.cols;

            var tileInfo = data.tileInfo;

            if (tileInfo.spatialReference.wkid === 102100) {
                var levelZeroResolution = tileInfo.lods[0].resolution;
                var rows = tileInfo.rows;
                var cols = tileInfo.cols;
                var west = tileInfo.origin.x;
                var north = tileInfo.origin.y;
                var east = west + levelZeroResolution * cols;
                var south = north - levelZeroResolution * rows;

                that.projection = Projections.MERCATOR;
                that.tilingScheme = new WebMercatorTilingScheme({
                    extentSouthwestInMeters: new Cartesian2(west, south),
                    extentNortheastInMeters: new Cartesian2(east, north)
                });
                that.maxExtent = that.tilingScheme.extent;
            } else if (data.tileInfo.spatialReference.wkid === 4326) {
                that.projection = Projections.WGS84;
                that.maxExtent = new Extent(CesiumMath.toRadians(data.fullExtent.xmin),
                                            CesiumMath.toRadians(data.fullExtent.ymin),
                                            CesiumMath.toRadians(data.fullExtent.xmax),
                                            CesiumMath.toRadians(data.fullExtent.ymax));
                that.tilingScheme = new GeographicTilingScheme({
                    extent: that.maxExtent
                });
            }

            that.zoomMax = data.tileInfo.lods.length - 1;

            // Create the copyright message.
            var canvas = document.createElement('canvas');
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.font = '12px sans-serif';
            context.textBaseline = 'top';
            context.fillText(data.copyrightText, 0, 0);

            that._logo = canvas;
            that.ready = true;

            return true;
        });

        this._discardPolicy = when(isReady, function() {
            // assume that the tile at (0,0) at the maximum zoom is missing.
            var missingTileUrl = that.buildTileImageUrl(0, 0, that.zoomMax);
            var pixelsToCheck = [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)];

            return when(missingTileUrl, function(missingImageUrl) {
                return new DiscardMissingTileImagePolicy(missingImageUrl, pixelsToCheck);
            });
        });
    }

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @memberof ArcGISMapServerTileProvider
     *
     * @param {Number} x The x coordinate of the tile image.
     * @param {Number} y The y coordinate of the tile image.
     * @param {Number} zoom The zoom level of the tile image.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    ArcGISMapServerTileProvider.prototype.buildTileImageUrl = function(x, y, zoom) {
        var url = this.url + '/tile/' + zoom + '/' + y + '/' + x;

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
    };

    /**
     * Load the image for a given tile.
     *
     * @memberof ArcGISMapServerTileProvider
     *
     * @param {String} [tileImageUrl] The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     */
    ArcGISMapServerTileProvider.prototype.loadTileImage = function(tileImageUrl) {
        var image = when(tileImageUrl, loadImage);

        return when(this._discardPolicy, function(discardPolicy) {
            return discardPolicy.shouldDiscardTileImage(image);
        }).then(function(shouldDiscard) {
            return shouldDiscard ? undefined : image;
        });
    };

    /**
     * DOC_TBA
     * @memberof ArcGISMapServerTileProvider
     */
    ArcGISMapServerTileProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return ArcGISMapServerTileProvider;
});