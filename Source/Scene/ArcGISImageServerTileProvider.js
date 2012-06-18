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
     * Provides tile images hosted by an ArcGIS ImageServer.
     *
     * @name ArcGISImageServerTileProvider
     * @constructor
     *
     * @param {String} description.host The ArcGIS Server host name.
     * @param {String} [description.instance='/arcgis/rest'] The instance name.
     * @param {String} [description.folder=undefined] The folder where the service is located.
     * @param {String} description.service The service name.
     * @param {String} [description.token=undefined] The token authorizing access to the service.
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.host</code> is required.
     * @exception {DeveloperError} <code>description.service</code> is required.
     *
     * @see ArcGISTileProvider
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href="http://resources.esri.com/help/9.3/arcgisserver/apis/rest/">ArcGIS Server REST API</a>
     * @see <a href="http://www.w3.org/TR/cors/">Cross-Origin Resource Sharing</a>
     *
     * @example
     * // ArcGIS World Street Maps tile provider
     * var esri = new ArcGISImageServerTileProvider({
     *     host : 'elevation.arcgisonline.com',
     *     folder : 'WorldElevation',
     *     service : 'DTMEllipsoidal'
     * });
     */
    function ArcGISImageServerTileProvider(description) {
        var desc = description || {};
        var instance = desc.instance || 'ArcGIS/rest';

        if (!desc.host) {
            throw new DeveloperError("description.host is required.");
        }

        if (!desc.service) {
            throw new DeveloperError("description.service is required.");
        }

        this._url = 'http://' + desc.host + '/' + instance + '/services/';

        if (desc.folder) {
            this._url += desc.folder + '/';
        }

        this._url += desc.service + '/ImageServer';

        /**
         * The ArcGIS Server host name.
         * @type {String}
         */
        this.host = desc.host;

        /**
         * The instance name. The default value is "/arcgis/rest".
         * @type {String}
         */
        this.instance = instance;

        /**
         * The folder where the service is located.
         * @type {String}
         */
        this.folder = desc.folder;

        /**
         * The service name.
         * @type {String}
         */
        this.service = desc.service;

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

        /**
         * The authorization token to use to connect to the service.
         *
         * @type {String}
         */
        this.token = description.token;

        this._logo = undefined;
        this._logoLoaded = false;

        var that = this;
        jsonp(this._url, function(data) {
            var credit = data.copyrightText;

            var canvas = document.createElement("canvas");
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext("2d");
            context.fillStyle = "#fff";
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
     * @memberof ArcGISImageServerTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    ArcGISImageServerTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError("tile.zoom must be between in [zoomMin, zoomMax].");
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var xMin = -20037508.34;
        var xMax = 20037508.8125515;

        var yMin = -20037508.8125515;
        var yMax = 20037508.34;

        var tilesInEachDirection = 1 << tile.zoom;
        var xDelta = (xMax - xMin) / tilesInEachDirection;
        var yDelta = (yMax - yMin) / tilesInEachDirection;

        var tileY = tilesInEachDirection - tile.y - 1;

        var xStart = xMin + xDelta * tile.x;
        var xStop = xMin + xDelta * (tile.x + 1);

        var yStart = yMin + yDelta * tileY;
        var yStop = yMin + yDelta * (tileY + 1);

        var bbox = xStart + '%2C' + yStart + '%2C' + xStop + '%2C' + yStop;

        var url = this._url + '/exportImage?format=tiff&f=image&size=256%2C256&bbox=' + bbox;
        if (this.token) {
            url += '&token=' + this.token;
        }
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        image.src = url;

        return image;
    };

    /**
     * DOC_TBA
     * @memberof ArcGISImageServerTileProvider
     */
    ArcGISImageServerTileProvider.prototype.getLogo = function() {
        return (this._logoLoaded) ? this._logo : undefined;
    };

    return ArcGISImageServerTileProvider;
});