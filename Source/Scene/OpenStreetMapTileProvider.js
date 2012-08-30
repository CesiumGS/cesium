/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/writeTextToCanvas',
        './Projections'
    ], function(
        DeveloperError,
        Extent,
        CesiumMath,
        writeTextToCanvas,
        Projections) {
    "use strict";

    /**
     * Provides tile images hosted by OpenStreetMap.
     *
     * @alias OpenStreetMapTileProvider
     * @constructor
     *
     * @param {String} description.url The OpenStreetMap url.
     * @param {String} [description.fileExtension='png'] The file extension for images on the server.
     * @param {Object} [description.proxy=undefined] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A string crediting the data source, which is displayed on the canvas.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see ArcGISTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://wiki.openstreetmap.org/wiki/Main_Page'>OpenStreetMap Wiki</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new OpenStreetMapTileProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    var OpenStreetMapTileProvider = function(description) {
        var desc = description || {};

        this._url = desc.url || 'http://tile.openstreetmap.org/';
        this._fileExtension = desc.fileExtension || 'png';

        /**
         * A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
         * @type {Object}
         */
        this._proxy = desc.proxy;

        this._credit = desc.credit || 'MapQuest, Open Street Map and contributors, CC-BY-SA';

        // TODO: should not hard-code, get from server?

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
            throw new DeveloperError('tile.zoom must be between in [zoomMin, zoomMax].');
        }

        var image = new Image();
        image.onload = onload;
        image.onerror = onerror;
        image.crossOrigin = '';

        var url = this._url + tile.zoom + '/' + tile.x + '/' + tile.y + '.' + this._fileExtension;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        image.src = url;

        return image;
    };

    /**
     * DOC_TBA
     * @memberof OpenStreetMapTileProvider
     */
    OpenStreetMapTileProvider.prototype.getLogo = function() {
        if (!this._logo) {
            this._logo = writeTextToCanvas(this._credit, {
                font : '12px sans-serif'
            });
        }

        return this._logo;
    };

    return OpenStreetMapTileProvider;
});