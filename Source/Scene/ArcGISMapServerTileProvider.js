/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/jsonp',
        './Projections'
    ], function(
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
     *     host : 'server.arcgisonline.com',
     *     service : 'World_Street_Map'
     * });
     */
    function ArcGISMapServerTileProvider(description) {
        var desc = description || {};

        if (!desc.url) {
            throw new DeveloperError('description.url is required.');
        }

        /**
         * The URL of the ArcGIS MapServer.
         * @type {String}
         */
        this.url = desc.url;

        this._proxy = desc.proxy;

        // TODO: Get this information from the server

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Extent}
         */
        this.maxExtent = new Extent(
            -CesiumMath.PI,
            CesiumMath.toRadians(-85.05112878),
            CesiumMath.PI,
            CesiumMath.toRadians(85.05112878)
        );

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = 256;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = 256;

        /**
         * The maximum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMax = 19;

        /**
         * The minimum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMin = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.MERCATOR;

        this._logo = undefined;
        this._logoLoaded = false;

        var that = this;
        jsonp(this.url, function(data) {
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
        }, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        });
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
        return (this._logoLoaded) ? this._logo : undefined;
    };

    return ArcGISMapServerTileProvider;
});