/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        './Projections'
    ], function(
        DeveloperError,
        CesiumMath,
        Projections) {
    "use strict";
    /*global document,Image*/

    /**
     * Provides tile images hosted by OpenStreetMap.
     *
     * @name OpenStreetMapTileProvider
     * @constructor
     *
     * @param {String} description.url The OpenStreetMap url.
     * @param {String} description.proxy A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see ArcGISTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href="http://wiki.openstreetmap.org/wiki/Main_Page">OpenStreetMap Wiki</a>
     * @see <a href="http://www.w3.org/TR/cors/">Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new OpenStreetMapTileProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    function OpenStreetMapTileProvider(description) {
        var desc = description || {};

        this._url = desc.url || 'http://tile.openstreetmap.org/';

        /**
         * A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
         * @type {String}
         */
        this.proxy = desc.proxy;

        // TODO: should not hard-code, get from server?

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
        this.zoomMax = 18;

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
    }

    OpenStreetMapTileProvider.prototype._getUrl = function(tile) {
        var url = '';
        if (this.proxy) {
            url += this.proxy + '?';
        }
        url += this._url + tile.zoom + '/' + tile.x + '/' + tile.y + '.png';

        return url;
    };

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof OpenStreetMapTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    OpenStreetMapTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
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
     * @memberof OpenStreetMapTileProvider
     */
    OpenStreetMapTileProvider.prototype.getLogo = function() {
        if (!this._logo) {
            var credit = "MapQuest, Open Street Map and contributors, CC-BY-SA";
            var canvas = document.createElement("canvas");
            canvas.width = 800.0;
            canvas.height = 20.0;

            var context = canvas.getContext("2d");
            context.fillStyle = "#fff";
            context.font = '12px sans-serif';
            context.textBaseline = 'top';
            context.fillText(credit, 0, 0);

            this._logo = canvas;
        }

        return this._logo;
    };

    return OpenStreetMapTileProvider;
});
