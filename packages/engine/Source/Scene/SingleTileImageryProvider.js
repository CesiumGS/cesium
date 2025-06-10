import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 * @typedef {object} SingleTileImageryProvider.ConstructorOptions
 *
 * Initialization options for the SingleTileImageryProvider constructor
 *
 * @property {Resource|string} url The url for the tile.
 * @property {number} [tileWidth] The width of the tile, in pixels.
 * @property {number} [tileHeight] The height of the tile, in pixels.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 */

/**
 * Provides a single, top-level imagery tile.  The single image is assumed to be in
 * the Geographic projection (i.e. WGS84 / EPSG:4326),
 * and will be rendered using a {@link GeographicTilingScheme}.
 *
 * @alias SingleTileImageryProvider
 * @constructor
 *
 * @param {SingleTileImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 */
function SingleTileImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

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

  const rectangle = options.rectangle ?? Rectangle.MAX_VALUE;
  const tilingScheme = new GeographicTilingScheme({
    rectangle: rectangle,
    numberOfLevelZeroTilesX: 1,
    numberOfLevelZeroTilesY: 1,
    ellipsoid: options.ellipsoid,
  });
  this._tilingScheme = tilingScheme;
  this._image = undefined;
  this._texture = undefined;

  this._hasError = false;
  this._errorEvent = new Event();

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", options.url);
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(options.url);
  this._resource = resource;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.tileWidth", options.tileWidth);
  Check.typeOf.number("options.tileHeight", options.tileHeight);
  //>>includeEnd('debug');

  this._tileWidth = options.tileWidth;
  this._tileHeight = options.tileHeight;
}

Object.defineProperties(SingleTileImageryProvider.prototype, {
  /**
   * Gets the URL of the single, top-level imagery tile.
   * @memberof SingleTileImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource.url;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._resource.proxy;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return 0;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof SingleTileImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return 0;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
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
   * @memberof SingleTileImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof SingleTileImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },
});

function failure(resource, error, provider, previousError) {
  let message = `Failed to load image ${resource.url}`;
  if (defined(error) && defined(error.message)) {
    message += `: ${error.message}`;
  }

  const reportedError = TileProviderError.reportError(
    previousError,
    provider,
    defined(provider) ? provider._errorEvent : undefined,
    message,
    0,
    0,
    0,
    error,
  );
  if (reportedError.retry) {
    return doRequest(resource, provider, reportedError);
  }

  if (defined(provider)) {
    provider._hasError = true;
  }
  throw new RuntimeError(message);
}

async function doRequest(resource, provider, previousError) {
  try {
    const image = await ImageryProvider.loadImage(null, resource);
    return image;
  } catch (error) {
    return failure(resource, error, provider, previousError);
  }
}

/**
 * @typedef {Object} SingleTileImageryProvider.fromUrlOptions
 *
 * Initialization options for the SingleTileImageryProvider constructor when using SingleTileImageryProvider.fromUrl
 *
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {Credit|String} [credit] A credit for the data source, which is displayed on the canvas.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 */

/**
 * Creates a provider for a single, top-level imagery tile.  The single image is assumed to use a
 * @param {Resource|String} url The url for the tile
 * @param {SingleTileImageryProvider.fromUrlOptions} [options] Object describing initialization options.
 * @returns {Promise.<SingleTileImageryProvider>} The resolved SingleTileImageryProvider.
 *
 * @example
 * const provider = await SingleTileImageryProvider.fromUrl("https://yoururl.com/image.png");
 */
SingleTileImageryProvider.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(url);
  const image = await doRequest(resource);

  options = options ?? Frozen.EMPTY_OBJECT;
  const provider = new SingleTileImageryProvider({
    ...options,
    url: url,
    tileWidth: image.width,
    tileHeight: image.height,
  });
  provider._image = image;
  return provider;
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
SingleTileImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

/**
 * Requests the image for a given tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<ImageryTypes>|undefined} The resolved image
 */
SingleTileImageryProvider.prototype.requestImage = async function (
  x,
  y,
  level,
  request,
) {
  if (!this._hasError && !defined(this._image)) {
    const image = await doRequest(this._resource, this);
    this._image = image;
    TileProviderError.reportSuccess(this._errorEvent);
    return image;
  }

  return this._image;
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
SingleTileImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  return undefined;
};
export default SingleTileImageryProvider;
