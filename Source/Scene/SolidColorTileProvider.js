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
     * Provides tile images with a different solid color for each zoom level.
     * Useful for debugging or testing different <code>CentralBody</code> options.
     *
     * @name SolidColorTileProvider
     * @constructor
     *
     * @param {Number} [maxZoom=23] The maximum zoom level to generate tiles.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    function SolidColorTileProvider(maxZoom) {
        var width = 256;
        var height = 256;
        maxZoom = maxZoom || 23;

        this._images = [];
        for (var i = 0; i <= maxZoom; ++i) {
            var color = {
                    r : Math.floor(Math.random() * 256),
                    g : Math.floor(Math.random() * 256),
                    b : Math.floor(Math.random() * 256)
            };
            this._images.push(this._createImage(color, width, height));
        }

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Object}
         */
        this.maxExtent = {
            north : CesiumMath.PI_OVER_TWO,
            south : -CesiumMath.PI_OVER_TWO,
            west : -CesiumMath.PI,
            east : CesiumMath.PI
        };

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = width;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = height;

        /**
         * The maximum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMax = this._images.length - 1;

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
        this.projection = Projections.WGS84;
    }

    SolidColorTileProvider.prototype._createImage = function(color, width, height) {
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext("2d");
        context.fillStyle = "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 1.0)";
        context.fillRect(0, 0, width, height);

        return canvas;
    };

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof SolidColorTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    SolidColorTileProvider.prototype.loadTileImage = function(tile, onload, onerror) {
        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError("The zoom must be between in [zoomMin, zoomMax].", "tile.zoom");
        }

        if (typeof onload === "function") {
            onload();
        }

        return this._images[tile.zoom];
    };

    return SolidColorTileProvider;
});