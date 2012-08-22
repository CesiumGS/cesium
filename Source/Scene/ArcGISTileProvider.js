/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/jsonp',
        '../Core/writeTextToCanvas',
        './Projections'
    ], function(
        DeveloperError,
        Extent,
        CesiumMath,
        jsonp,
        writeTextToCanvas,
        Projections) {
    "use strict";

    /**
     * Provides tile images hosted by an ArcGIS Server.
     *
     * @alias ArcGISTileProvider
     * @constructor
     *
     * @param {String} description.host The ArcGIS Server host name.
     * @param {String} [description.instance='/arcgis/rest'] The instance name.
     * @param {String} [description.folder=undefined] The folder where the service is located.
     * @param {String} description.service The service name.
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.host</code> is required.
     * @exception {DeveloperError} <code>description.service</code> is required.
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
     * var esri = new ArcGISTileProvider({
     *     host : 'server.arcgisonline.com',
     *     service : 'World_Street_Map'
     * });
     */
    var ArcGISTileProvider = function(description) {
        var desc = description || {};
        var instance = desc.instance || 'arcgis/rest';

        if (!desc.host) {
            throw new DeveloperError('description.host is required.');
        }

        if (!desc.service) {
            throw new DeveloperError('description.service is required.');
        }

        this._url = 'http://' + desc.host + '/' + instance + '/services/';

        if (desc.folder) {
            this._url += desc.folder + '/';
        }

        this._url += desc.service + '/MapServer';

        /**
         * The ArcGIS Server host name.
         * @type {String}
         */
        this.host = desc.host;

        /**
         * The instance name. The default value is '/arcgis/rest'.
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

        this._logo = undefined;
        this._logoLoaded = false;

        var that = this;
        jsonp(this._url, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        }).then(function(data) {
            that._logo = writeTextToCanvas(data.copyrightText, {
                font : '12px sans-serif'
            });
            that._logoLoaded = true;
        });
    };

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof ArcGISTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    ArcGISTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError('tile.zoom must be between in [zoomMin, zoomMax].');
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var url = this._url + '/tile/' + tile.zoom + '/' + tile.y + '/' + tile.x;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        image.src = url;

        return image;
    };

    /**
     * DOC_TBA
     * @memberof ArcGISTileProvider
     */
    ArcGISTileProvider.prototype.getLogo = function() {
        return (this._logoLoaded) ? this._logo : undefined;
    };

    return ArcGISTileProvider;
});