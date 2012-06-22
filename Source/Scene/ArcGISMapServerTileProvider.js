/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/jsonp',
        './Projections',
        './MercatorTilingScheme',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        DeveloperError,
        Extent,
        CesiumMath,
        jsonp,
        Projections,
        MercatorTilingScheme,
        GeographicTilingScheme) {
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
         * @see MercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = undefined;

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = false;

        // Grab the details of this MapServer.
        var that = this;
        jsonp(this.url, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        }).then(function(data) {
            // Grab tile details.
            that.tileWidth = data.tileInfo.rows;
            that.tileHeight = data.tileInfo.cols;

            if (data.tileInfo.spatialReference.wkid === 102100) {
                that.projection = Projections.MERCATOR;
                that.tilingScheme = new MercatorTilingScheme();
                // TODO: Determine extent from service description.
                that.maxExtent = new Extent(-CesiumMath.PI,
                                            CesiumMath.toRadians(-85.05112878),
                                            CesiumMath.PI,
                                            CesiumMath.toRadians(85.05112878));
            } else if (data.tileInfo.spatialReference.wkid === 4326) {
                that.projection = Projections.WGS84;
                that.tilingScheme = new GeographicTilingScheme();
                that.maxExtent = new Extent(CesiumMath.toRadians(data.fullExtent.xmin),
                                            CesiumMath.toRadians(data.fullExtent.ymin),
                                            CesiumMath.toRadians(data.fullExtent.xmax),
                                            CesiumMath.toRadians(data.fullExtent.ymax));
            }

            that.zoomMax = data.tileInfo.lods.length - 1;

            // Create the copyright message.
            var credit = data.copyrightText;

            var canvas = document.createElement('canvas');
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.font = '12px sans-serif';
            context.textBaseline = 'top';
            context.fillText(credit, 0, 0);

            that._logo = canvas;
            that.ready = true;
        });

        this._logo = undefined;
    }

    /**
     * Determine whether a the image for a given tile is valid and should be displayed.
     *
     * @memberof ArcGISMapServerTileProvider
     *
     * @param tile The tile to check.
     *
     * @return {Boolean|Promise} Either a boolean, or a Promise for a boolean if the
     *                           process of checking is asynchronous.
     */
    ArcGISMapServerTileProvider.prototype.isTileAvailable = function(tile) {
        //TODO: any way to tell if a tile says 'Map data not yet available'?
        return true;
    };

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @memberof ArcGISMapServerTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    ArcGISMapServerTileProvider.prototype.getTileImageUrl = function(tile) {
        var url = this.url + '/tile/' + tile.zoom + '/' + tile.y + '/' + tile.x;

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
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