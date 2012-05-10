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

    /**
     * Provides a single, top-level tile.
     *
     * @name SingleTileProvider
     * @constructor
     *
     * @param {String} url The url for the tile.
     *
     * @exception {DeveloperError} url is required.
     *
     * @see ArcGISTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    function SingleTileProvider(url) {
        if (!url) {
            throw new DeveloperError("url is required.", "url");
        }

        this._url = url;

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @constant
         * @type {Object}
         */
        this.maxExtent = {
            north : CesiumMath.PI_OVER_TWO,
            south : -CesiumMath.PI_OVER_TWO,
            west : -CesiumMath.PI,
            east : CesiumMath.PI
        };

        /**
         * The maximum zoom level that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.zoomMax = 0;

        /**
         * The minimum zoom level that can be requested.
         *
         * @constant
         * @type {Number}
         */
        this.zoomMin = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;
    }

    /**
     * Loads the top-level tile.
     *
     * @memberof SingleTileProvider
     *
     * @param {Tile} tile The top-level tile.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    SingleTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
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
        image.src = this._url;

        return image;
    };

    return SingleTileProvider;
});