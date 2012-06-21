/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/jsonp',
        './Projections'
    ], function(
        defaultValue,
        DeveloperError,
        Extent,
        CesiumMath,
        jsonp,
        Projections) {
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
         * The minimum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMin = undefined;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = undefined;

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = false;

        // Grab the details of this MapServer.
        var that = this;
        jsonp(this.url, function(data) {
            // Grab tile details.
            that.tileWidth = data.tileInfo.rows;
            that.tileHeight = data.tileInfo.cols;

            if (data.tileInfo.spatialReference.wkid === 102100) {
                that.projection = Projections.MERCATOR;
                // TODO: Determine extent from service description.
                that.maxExtent = new Extent(-CesiumMath.PI,
                                            CesiumMath.toRadians(-85.05112878),
                                            CesiumMath.PI,
                                            CesiumMath.toRadians(85.05112878));
            } else if (data.tileInfo.spatialReference.wkid === 4326) {
                that.projection = Projections.WGS84;
                that.maxExtent = new Extent(CesiumMath.toRadians(data.fullExtent.xmin),
                                            CesiumMath.toRadians(data.fullExtent.ymin),
                                            CesiumMath.toRadians(data.fullExtent.xmax),
                                            CesiumMath.toRadians(data.fullExtent.ymax));
            }

            that.zoomMin = 0;
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
            that._logoLoaded = true;

            that.ready = typeof that.tileWidth !== 'undefined' &&
                         typeof that.tileHeight !== 'undefined' &&
                         typeof that.projection !== 'undefined' &&
                         typeof that.maxExtent !== 'undefined' &&
                         typeof that.zoomMin !== 'undefined' &&
                         typeof that.zoomMax !== 'undefined';
        }, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        });

        this._logo = undefined;
        this._logoLoaded = false;
    }

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof ArcGISMapServerTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    ArcGISMapServerTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError('tile.zoom must be between in [zoomMin, zoomMax].');
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var url = this.url + '/tile/' + tile.zoom + '/' + tile.y + '/' + tile.x;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        image.src = url;

        return image;
    };

    /**
     * DOC_TBA
     * @memberof ArcGISMapServerTileProvider
     */
    ArcGISMapServerTileProvider.prototype.getLogo = function() {
        return this._logoLoaded ? this._logo : undefined;
    };

    return ArcGISMapServerTileProvider;
});