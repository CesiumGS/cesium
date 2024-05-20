import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";

const defaultColor = new Color(1.0, 1.0, 1.0, 0.4);
const defaultGlowColor = new Color(0.0, 1.0, 0.0, 0.05);
const defaultBackgroundColor = new Color(0.0, 0.5, 0.0, 0.2);

/**
 * @typedef {object} GridImageryProvider.ConstructorOptions
 *
 * Initialization options for the GridImageryProvider constructor
 *
 * @property {TilingScheme} [tilingScheme=new GeographicTilingScheme()] The tiling scheme for which to draw tiles.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the default ellipsoid is used.
 * @property {number} [cells=8] The number of grids cells.
 * @property {Color} [color=Color(1.0, 1.0, 1.0, 0.4)] The color to draw grid lines.
 * @property {Color} [glowColor=Color(0.0, 1.0, 0.0, 0.05)] The color to draw glow for grid lines.
 * @property {number} [glowWidth=6] The width of lines used for rendering the line glow effect.
 * @property {Color} [backgroundColor=Color(0.0, 0.5, 0.0, 0.2)] Background fill color.
 * @property {number} [tileWidth=256] The width of the tile for level-of-detail selection purposes.
 * @property {number} [tileHeight=256] The height of the tile for level-of-detail selection purposes.
 * @property {number} [canvasSize=256] The size of the canvas used for rendering.
 */

/**
 * An {@link ImageryProvider} that draws a wireframe grid on every tile with controllable background and glow.
 * May be useful for custom rendering effects or debugging terrain.
 *
 * @alias GridImageryProvider
 * @constructor
 * @param {GridImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 */
function GridImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._defaultAlpha = undefined;
  this._defaultNightAlpha = undefined;
  this._defaultDayAlpha = undefined;
  this._defaultBrightness = undefined;
  this._defaultContrast = undefined;
  this._defaultHue = undefined;
  this._defaultSaturation = undefined;
  this._defaultGamma = undefined;
  this._defaultMinificationFilter = undefined;
  this._defaultMagnificationFilter = undefined;

  this._tilingScheme = defined(options.tilingScheme)
    ? options.tilingScheme
    : new GeographicTilingScheme({ ellipsoid: options.ellipsoid });
  this._cells = defaultValue(options.cells, 8);
  this._color = defaultValue(options.color, defaultColor);
  this._glowColor = defaultValue(options.glowColor, defaultGlowColor);
  this._glowWidth = defaultValue(options.glowWidth, 6);
  this._backgroundColor = defaultValue(
    options.backgroundColor,
    defaultBackgroundColor
  );
  this._errorEvent = new Event();

  this._tileWidth = defaultValue(options.tileWidth, 256);
  this._tileHeight = defaultValue(options.tileHeight, 256);

  // A little larger than tile size so lines are sharper
  // Note: can't be too much difference otherwise texture blowout
  this._canvasSize = defaultValue(options.canvasSize, 256);

  // We only need a single canvas since all tiles will be the same
  this._canvas = this._createGridCanvas();
}

Object.defineProperties(GridImageryProvider.prototype, {
  /**
   * Gets the proxy used by this provider.
   * @memberof GridImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof GridImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof GridImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof GridImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof GridImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof GridImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof GridImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._tilingScheme.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof GridImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof GridImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof GridImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof GridImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },
});

/**
 * Draws a grid of lines into a canvas.
 */
GridImageryProvider.prototype._drawGrid = function (context) {
  const minPixel = 0;
  const maxPixel = this._canvasSize;
  for (let x = 0; x <= this._cells; ++x) {
    const nx = x / this._cells;
    const val = 1 + nx * (maxPixel - 1);

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
GridImageryProvider.prototype._createGridCanvas = function () {
  const canvas = document.createElement("canvas");
  canvas.width = this._canvasSize;
  canvas.height = this._canvasSize;
  const minPixel = 0;
  const maxPixel = this._canvasSize;

  const context = canvas.getContext("2d");

  // Fill the background
  const cssBackgroundColor = this._backgroundColor.toCssColorString();
  context.fillStyle = cssBackgroundColor;
  context.fillRect(minPixel, minPixel, maxPixel, maxPixel);

  // Glow for grid lines
  const cssGlowColor = this._glowColor.toCssColorString();
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
  const cssColor = this._color.toCssColorString();
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
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
GridImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

/**
 * Requests the image for a given tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<HTMLCanvasElement>} The resolved image as a Canvas DOM object.
 */
GridImageryProvider.prototype.requestImage = function (x, y, level, request) {
  return Promise.resolve(this._canvas);
};

/**
 * Picking features is not currently supported by this imagery provider, so this function simply returns
 * undefined.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {number} longitude The longitude at which to pick features.
 * @param {number} latitude  The latitude at which to pick features.
 * @return {undefined} Undefined since picking is not supported.
 */
GridImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};
export default GridImageryProvider;
