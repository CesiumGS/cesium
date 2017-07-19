define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        Event,
        GeographicTilingScheme,
        when) {
    'use strict';

    var defaultColor = new Color(1.0, 1.0, 1.0, 0.4);
    var defaultGlowColor = new Color(0.0, 1.0, 0.0, 0.05);
    var defaultBackgroundColor = new Color(0.0, 0.5, 0.0, 0.2);

    /**
     * An {@link ImageryProvider} that draws a wireframe grid on every tile with controllable background and glow.
     * May be useful for custom rendering effects or debugging terrain.
     *
     * @alias GridImageryProvider
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {TilingScheme} [options.tilingScheme=new GeographicTilingScheme()] The tiling scheme for which to draw tiles.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *                    parameter is specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.cells=8] The number of grids cells.
     * @param {Color} [options.color=Color(1.0, 1.0, 1.0, 0.4)] The color to draw grid lines.
     * @param {Color} [options.glowColor=Color(0.0, 1.0, 0.0, 0.05)] The color to draw glow for grid lines.
     * @param {Number} [options.glowWidth=6] The width of lines used for rendering the line glow effect.
     * @param {Color} [options.backgroundColor=Color(0.0, 0.5, 0.0, 0.2)] Background fill color.
     * @param {Number} [options.tileWidth=256] The width of the tile for level-of-detail selection purposes.
     * @param {Number} [options.tileHeight=256] The height of the tile for level-of-detail selection purposes.
     * @param {Number} [options.canvasSize=256] The size of the canvas used for rendering.
     */
    function GridImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new GeographicTilingScheme({ ellipsoid : options.ellipsoid });
        this._cells = defaultValue(options.cells, 8);
        this._color = defaultValue(options.color, defaultColor);
        this._glowColor = defaultValue(options.glowColor, defaultGlowColor);
        this._glowWidth = defaultValue(options.glowWidth, 6);
        this._backgroundColor = defaultValue(options.backgroundColor, defaultBackgroundColor);
        this._errorEvent = new Event();

        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);

        // A little larger than tile size so lines are sharper
        // Note: can't be too much difference otherwise texture blowout
        this._canvasSize = defaultValue(options.canvasSize, 256);

        // We only need a single canvas since all tiles will be the same
        this._canvas = this._createGridCanvas();

        this._readyPromise = when.resolve(true);
    }

    defineProperties(GridImageryProvider.prototype, {
        /**
         * Gets the proxy used by this provider.
         * @memberof GridImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight : {
            get : function() {
                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof GridImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof GridImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return true;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof GridImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof GridImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

    /**
     * Draws a grid of lines into a canvas.
     */
    GridImageryProvider.prototype._drawGrid = function(context) {
        var minPixel = 0;
        var maxPixel = this._canvasSize;
        for (var x = 0; x <= this._cells; ++x) {
            var nx = x / this._cells;
            var val = 1 + nx * (maxPixel - 1);

            context.moveTo(val, minPixel);
            context.lineTo(val, maxPixel);
            context.moveTo(minPixel, val);
            context.lineTo(maxPixel, val);
        }
        context.stroke();
    };

    /**
     * Render a grid into a canvas with background and glow
     */
    GridImageryProvider.prototype._createGridCanvas = function() {
        var canvas = document.createElement('canvas');
        canvas.width = this._canvasSize;
        canvas.height = this._canvasSize;
        var minPixel = 0;
        var maxPixel = this._canvasSize;

        var context = canvas.getContext('2d');

        // Fill the background
        var cssBackgroundColor = this._backgroundColor.toCssColorString();
        context.fillStyle = cssBackgroundColor;
        context.fillRect(minPixel, minPixel, maxPixel, maxPixel);

        // Glow for grid lines
        var cssGlowColor = this._glowColor.toCssColorString();
        context.strokeStyle = cssGlowColor;
        // Wide
        context.lineWidth = this._glowWidth;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        this._drawGrid(context);
        // Narrow
        context.lineWidth = this._glowWidth * 0.5;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        this._drawGrid(context);

        // Grid lines
        var cssColor = this._color.toCssColorString();
        // Border
        context.strokeStyle = cssColor;
        context.lineWidth = 2;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        // Inner
        context.lineWidth = 1;
        this._drawGrid(context);

        return canvas;
    };

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    GridImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link GridImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Image|Canvas>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    GridImageryProvider.prototype.requestImage = function(x, y, level, request) {
        return this._canvas;
    };

    /**
     * Picking features is not currently supported by this imagery provider, so this function simply returns
     * undefined.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    GridImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };

    return GridImageryProvider;
});
