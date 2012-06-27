/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/Extent',
        '../Core/Math',
        './Projections',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        loadImage,
        DeveloperError,
        Color,
        Extent,
        CesiumMath,
        Projections,
        GeographicTilingScheme) {
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
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;

        /**
         * The tiling scheme used by this tile provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX: 1,
            numberOfLevelZeroTilesY: 1
        });

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
     * @param {Number} x The x coordinate of the tile image.
     * @param {Number} y The y coordinate of the tile image.
     * @param {Number} zoom The zoom level of the tile image.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    SolidColorTileProvider.prototype.buildTileImageUrl = function(x, y, zoom) {
        var canvas = this._canvases[zoom];
        if (typeof canvas === 'undefined') {
            canvas = document.createElement('canvas');
            canvas.width = this.tileWidth;
            canvas.height = this.tileHeight;

            var color = new Color();

            x = zoom / this.zoomMax;
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

            this._canvases[zoom] = canvas;
        }

        return canvas.toDataURL();
    };

    /**
     * Load the image for a given tile.
     *
     * @memberof SolidColorTileProvider
     *
     * @param {String} [tileImageUrl] The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     */
    SolidColorTileProvider.prototype.loadTileImage = function(tileImageUrl) {
        return loadImage(tileImageUrl);
    };

    return SolidColorTileProvider;
});