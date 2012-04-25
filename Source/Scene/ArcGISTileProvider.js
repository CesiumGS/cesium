/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../ThirdParty/jsonp',
        './Projections'
    ], function(
        DeveloperError,
        CesiumMath,
        jsonp,
        Projections) {
    "use strict";
    /*global document,Image*/

    /**
     * Provides tile images hosted by an ArcGIS Server.
     *
     * @name ArcGISTileProvider
     * @constructor
     *
     * @param {String} description.host The ArcGIS Server host name.
     * @param {String} description.instance The instance name. The default value is "/arcgis/rest".
     * @param {String} description.folder The folder where the service is located.
     * @param {String} description.service The service name.
     * @param {String} description.proxy A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
     *
     * @exception {DeveloperError} <code>description.host</code> is required.
     * @exception {DeveloperError} <code>description.service</code> is required.
     *
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
     * var esri = new ArcGISTileProvider({
     *     host : 'server.arcgisonline.com',
     *     service : 'World_Street_Map'
     * });
     */
    function ArcGISTileProvider(description) {
        var desc = description || {};
        var instance = desc.instance || 'arcgis/rest';

        if (!desc.host) {
            throw new DeveloperError("description.host is required.", "description.host");
        }

        if (!desc.service) {
            throw new DeveloperError("description.service is required.", "description.service");
        }

        this._url = '';
        if (desc.proxy) {
            this._url += desc.proxy + '?';
        }
        this._url += 'http://' + desc.host + '/' + instance + '/services/';
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

        /**
         * A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
         * @type {String}
         */
        this.proxy = desc.proxy;

        // TODO: Get this information from the server

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Object}
         */
        this.maxExtent = {
            north : CesiumMath.toRadians(85.05112878),
            south : CesiumMath.toRadians(-85.05112878),
            west : -CesiumMath.PI,
            east : CesiumMath.PI
        };

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
        var callback = function(data) {
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
        };
        jsonp(this._url, {
            f : 'json'
        }, callback);
    }

    ArcGISTileProvider.prototype._getUrl = function(tile) {
        return this._url + '/tile/' + tile.zoom + '/' + tile.y + '/' + tile.x;
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
            throw new DeveloperError("The zoom must be between in [zoomMin, zoomMax].", "tile.zoom");
        }

        var image = new Image();
        if (onload && typeof onload === "function") {
            image.onload = function() {
                onload();
            };
        }
        if (onerror && typeof onerror === "function") {
            image.onerror = function() {
                onerror();
            };
        }
        image.crossOrigin = '';
        image.src = this._getUrl(tile);

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