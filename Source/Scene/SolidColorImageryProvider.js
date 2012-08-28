/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/Extent',
        '../Core/Math',
        './ImageryProvider',
        './Projections',
        './GeographicTilingScheme',
        './ImageryState'
    ], function(
        defaultValue,
        loadImage,
        DeveloperError,
        Color,
        Extent,
        CesiumMath,
        ImageryProvider,
        Projections,
        GeographicTilingScheme,
        ImageryState) {
    "use strict";

    /**
     * Provides tile images with a different solid color for each level.
     * Useful for debugging or testing different {@link CentralBody} options.
     *
     * @alias SolidColorImageryProvider
     * @constructor
     *
     * @param {Number} [maxLevel=23] The maximum level to generate tiles for.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     */
    var SolidColorImageryProvider = function(maxLevel) {
        maxLevel = defaultValue(maxLevel, 23);

        this._canvases = [];

        /**
         * The cartographic extent of this provider's imagery,
         * with north, south, east and west properties in radians.
         *
         * @type {Extent}
         */
        this.extent = Extent.MAX_VALUE;

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
         * The maximum level-of-detail that can be requested.
         *
         * @type {Number}
         */
        this.maxLevel = maxLevel;

        /**
         * The tiling scheme used by this provider.
         *
         * @type {TilingScheme}
         * @see WebMercatorTilingScheme
         * @see GeographicTilingScheme
         */
        this.tilingScheme = new GeographicTilingScheme({
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });

        /**
         * True if the provider is ready for use; otherwise, false.
         *
         * @type {Boolean}
         */
        this.ready = true;
    };

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @param {Number} x The x coordinate of the tile.
     * @param {Number} y The y coordinate of the tile.
     * @param {Number} level The level-of-detail of the tile.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    SolidColorImageryProvider.prototype.buildImageUrl = function(x, y, level) {
        var canvas = this._canvases[level];
        if (typeof canvas === 'undefined') {
            canvas = document.createElement('canvas');
            canvas.width = this.tileWidth;
            canvas.height = this.tileHeight;

            var color = new Color(0.0, 0.0, 0.0, 1.0);

            x = level / this.maxLevel;
            if (x < 0.25) {
                // blue to cyan
                color.green = 4.0 * x;
                color.blue = 1.0;
            } else if (x < 0.5) {
                // cyan to green
                color.green = 1.0;
                color.blue = 2.0 - 4.0 * x;
            } else if (x < 0.75) {
                // green to yellow
                color.red = 4.0 * x - 2.0;
                color.green = 1.0;
            } else {
                // yellow to red
                color.red = 1.0;
                color.green = 4.0 * (1.0 - x);
            }

            var context = canvas.getContext('2d');
            context.fillStyle = color.toCSSColor();
            context.fillRect(0, 0, canvas.width, canvas.height);

            this._canvases[level] = canvas;
        }

        return canvas.toDataURL();
    };

    /**
     * Request the image for a given tile.
     *
     * @param {String} url The tile image URL.
     *
     * @return A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     */
    SolidColorImageryProvider.prototype.requestImage = function(tileImageUrl) {
        return loadImage(tileImageUrl);
    };

    /**
     * Transform the tile imagery from the format requested from the remote server
     * into a format suitable for resource creation.  Once complete, the tile imagery
     * state should be set to TRANSFORMED.  Alternatively, tile imagery state can be set to
     * RECEIVED to indicate that the transformation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {Imagery} imagery The imagery to transform.
     */
    SolidColorImageryProvider.prototype.transformImagery = function(context, imagery) {
        imagery.transformedImage = imagery.image;
        imagery.image = undefined;
        imagery.state = ImageryState.TRANSFORMED;
    };

    /**
     * Create WebGL resources for the tile imagery using whatever data the transformImagery step produced.
     * Once complete, the tile imagery state should be set to READY.  Alternatively, tile imagery state can be set to
     * TRANSFORMED to indicate that resource creation should be attempted again next update, if the tile
     * is still needed.
     *
     * @param {Context} context The context to use to create resources.
     * @param {TileImagery} tileImagery The tile imagery to create resources for.
     * @param {TexturePool} texturePool A texture pool to use to create textures.
     */
    SolidColorImageryProvider.prototype.createResources = ImageryProvider.prototype.createResources;

    return SolidColorImageryProvider;
});