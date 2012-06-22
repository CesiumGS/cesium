/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/Extent',
        '../Core/Math',
        './Projections'
    ], function(
        defaultValue,
        DeveloperError,
        Color,
        Extent,
        CesiumMath,
        Projections) {
    "use strict";

    /**
     * Provides tile images with a different solid color for each zoom level.
     * Useful for debugging or testing different {@link CentralBody} options.
     *
     * @name SolidColorTileProvider
     * @constructor
     *
     * @param {Number} [maxLevel=23] The maximum level to generate tiles for.
     *
     * @see SingleTileProvider
     * @see BingMapsTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    function SolidColorTileProvider(maxLevel) {
        maxLevel = defaultValue(maxLevel, 23);

        this._canvases = [];

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Extent}
         */
        this.maxExtent = Extent.MAX_VALUE;

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
        this.zoomMax = maxLevel;

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

        /**
         * True if the tile provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;
    }

    /**
     * Determine whether a the image for a given tile is valid and should be displayed.
     *
     * @memberof SolidColorTileProvider
     *
     * @param tile The tile to check.
     *
     * @return {Boolean|Promise} Either a boolean, or a Promise for a boolean if the
     *                           process of checking is asynchronous.
     */
    SolidColorTileProvider.prototype.isTileAvailable = function(tile) {
        return true;
    };

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @memberof SolidColorTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    SolidColorTileProvider.prototype.getTileImageUrl = function(tile) {
        var level = tile.zoom;
        var canvas = this._canvases[level];
        if (typeof canvas === 'undefined') {
            canvas = document.createElement('canvas');
            canvas.width = this.tileWidth;
            canvas.height = this.tileHeight;

            var color = new Color();

            var x = level / this.zoomMax;
            if (x < 0.25) {
                // blue to cyan
                color.green = 4.0 * x;
                color.blue = 255;
            } else if (x < 0.5) {
                // cyan to green
                color.green = 255;
                color.blue = 2.0 - 4.0 * x;
            } else if (x < 0.75) {
                // green to yellow
                color.red = 4.0 * x - 2.0;
                color.green = 255;
            } else {
                // yellow to red
                color.red = 255;
                color.green = 4.0 * (1.0 - x);
            }

            var context = canvas.getContext('2d');
            context.fillStyle = color.toCSSColor();
            context.fillRect(0, 0, canvas.width, canvas.height);

            this._canvases[level] = canvas;
        }

        return canvas.toDataURL();
    };

    return SolidColorTileProvider;
});