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
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
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
        var isReady = when(metadata, function(data) {
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
                that.tilingScheme = new WebMercatorTilingScheme({
                    extentSouthwestInMeters : new Cartesian2(west, south),
                    extentNortheastInMeters : new Cartesian2(east, north)
                });
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
        });

        this._discardPolicy = when(isReady, function() {
            // assume that the tile at (0,0) at the maximum LOD is missing.
            var missingTileUrl = that.buildImageUrl(0, 0, that.maxLevel);
            var pixelsToCheck = [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)];

            return when(missingTileUrl, function(missingImageUrl) {
                return new DiscardMissingTileImagePolicy(missingImageUrl, pixelsToCheck);
            });
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
        var image = loadImage(url);

        return when(this._discardPolicy, function(discardPolicy) {
            return discardPolicy.shouldDiscardTileImage(image);
        }).then(function(shouldDiscard) {
            return shouldDiscard ? undefined : image;
        });
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
    ArcGisMapServerImageryProvider.prototype.transformImagery = function(context, tileImagery) {
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
    ArcGisMapServerImageryProvider.prototype.createResources = function(context, tileImagery) {
        tileImagery.texture = ImageryProvider.createTextureFromTransformedImage(context, tileImagery.transformedImage);
        tileImagery.transformedImage = undefined;
        tileImagery.state = TileState.READY;
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