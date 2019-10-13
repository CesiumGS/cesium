import Color from '../Core/Color.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import Event from '../Core/Event.js';
import GeographicTilingScheme from '../Core/GeographicTilingScheme.js';
import when from '../ThirdParty/when.js';

    var defaultColor = new Color(1.0, 1.0, 1.0, 0.4);
    var defaultBackgroundColor = new Color(0.0, 0.5, 0.0, 0.2);

    /**
     * An {@link ImageryProvider} that draws a hexagonal grid on every tile with controllable background.
     * May be useful for custom rendering effects.
     *
     * @alias HexagonalGridImageryProvider
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {TilingScheme} [options.tilingScheme=new GeographicTilingScheme()] The tiling scheme for which to draw tiles.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *                    parameter is specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.cells=3] The number of grids cells.
     * @param {Color} [options.color=Color(1.0, 1.0, 1.0, 0.4)] The color to draw grid lines.
     * @param {Number} [options.lineWidth=2] The width of lines used for rendering the hexagonal grid line.
     * @param {Color} [options.backgroundColor=Color(0.0, 0.5, 0.0, 0.2)] Background fill color.
     * @param {Number} [options.tileWidth=256] The width of the tile for level-of-detail selection purposes.
     * @param {Number} [options.tileHeight=256] The height of the tile for level-of-detail selection purposes.
     * @param {Number} [options.canvasSize=256] The size of the canvas used for rendering.
     */
    function HexagonalGridImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new GeographicTilingScheme({ ellipsoid : options.ellipsoid });
        this._cells = defaultValue(options.cells, 3);
        this._color = defaultValue(options.color, defaultColor);
        this._lineWidth = defaultValue(options.lineWidth, 2);
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

    defineProperties(HexagonalGridImageryProvider.prototype, {
        /**
         * Gets the proxy used by this provider.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * @memberof HexagonalGridImageryProvider.prototype
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
         * @memberof HexagonalGridImageryProvider.prototype
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
         * @memberof HexagonalGridImageryProvider.prototype
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
         * the source of the imagery.  This function should not be called before {@link HexagonalGridImageryProvider#ready} returns true.
         * @memberof HexagonalGridImageryProvider.prototype
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
         * @memberof HexagonalGridImageryProvider.prototype
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
     * Draws a hexagonal grid of lines into a canvas.
     */
    HexagonalGridImageryProvider.prototype._drawHexagonalGrid = function(context) {
        var maxPixel = this._canvasSize;
        var cellPixel = maxPixel / this._cells;
        var halfCellPixel = cellPixel / 2;
        var topLineHalfWidth = cellPixel / 2 / Math.sqrt(3);
        var outerSideLineWidth = (cellPixel / 2 - topLineHalfWidth) / 2;

        for (var x = 0; x < maxPixel; x += cellPixel) {
            for (var y = 0 ; y < maxPixel; y += cellPixel) {
                // Draws a hexagonal pattern:
                //  ▁∕▔\▁
                //   \_∕
                context.moveTo(x, y + halfCellPixel);
                context.lineTo(x + outerSideLineWidth, y + halfCellPixel);
                context.lineTo(x + outerSideLineWidth + topLineHalfWidth, y);
                context.lineTo(x + outerSideLineWidth * 3 + topLineHalfWidth, y);
                context.lineTo(x + outerSideLineWidth * 3 + topLineHalfWidth * 2, y + halfCellPixel);
                context.lineTo(x + cellPixel, y + halfCellPixel);

                context.moveTo(x + outerSideLineWidth * 3 + topLineHalfWidth * 2, y + halfCellPixel);
                context.lineTo(x + outerSideLineWidth * 3 + topLineHalfWidth, y + cellPixel);
                context.lineTo(x + outerSideLineWidth + topLineHalfWidth, y + cellPixel);
                context.lineTo(x + outerSideLineWidth, y + halfCellPixel);
            }
        }
        context.stroke();
    };

    /**
     * Render a grid into a canvas with background
     */
    HexagonalGridImageryProvider.prototype._createGridCanvas = function() {
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

        // Hexagonal Grid lines
        var cssColor = this._color.toCssColorString();
        context.strokeStyle = cssColor;
        context.lineWidth = this._lineWidth;
        this._drawHexagonalGrid(context);

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
    HexagonalGridImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link HexagonalGridImageryProvider#ready} returns true.
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
    HexagonalGridImageryProvider.prototype.requestImage = function(x, y, level, request) {
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
    HexagonalGridImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
        return undefined;
    };
export default HexagonalGridImageryProvider;
