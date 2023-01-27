import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 * @typedef {Object} SingleTileImageryProvider.ConstructorOptions
 *
 * Initialization options for the SingleTileImageryProvider constructor
 *
 * @property {Resource|String} [url] The url for the tile. Deprecated.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {Credit|String} [credit] A credit for the data source, which is displayed on the canvas.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 */

/**
 * <div class="notice">
 * To construct a SingleTileImageryProvider, call {@link SingleTileImageryProvider.fromUrl}. Do not call the constructor directly.
 * </div>
 *
 * Provides a single, top-level imagery tile.  The single image is assumed to use a
 * {@link GeographicTilingScheme}.
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
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultAlpha = undefined;

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultNightAlpha = undefined;

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultDayAlpha = undefined;

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultBrightness = undefined;

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultContrast = undefined;

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultHue = undefined;

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultSaturation = undefined;

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultGamma = undefined;

  /**
   * The default texture minification filter to apply to this provider.
   *
   * @type {TextureMinificationFilter}
   * @default undefined
   */
  this.defaultMinificationFilter = undefined;

  /**
   * The default texture magnification filter to apply to this provider.
   *
   * @type {TextureMagnificationFilter}
   * @default undefined
   */
  this.defaultMagnificationFilter = undefined;

  const rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE);
  const tilingScheme = new GeographicTilingScheme({
    rectangle: rectangle,
    numberOfLevelZeroTilesX: 1,
    numberOfLevelZeroTilesY: 1,
    ellipsoid: options.ellipsoid,
  });
  this._tilingScheme = tilingScheme;
  this._image = undefined;
  this._texture = undefined;
  this._tileWidth = 0;
  this._tileHeight = 0;

  this._errorEvent = new Event();

  this._ready = false;

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  if (defined(options.url)) {
    deprecationWarning(
      "SingleTileImageryProvider options.url",
      "options.url was deprecated in CesiumJS 1.102.  It will be removed in 1.104. Use SingleTileImageryProvider.fromUrl instead."
    );

    const resource = Resource.createIfNeeded(options.url);
    this._resource = resource;
    this._readyPromise = doRequest(resource, this).then((image) => {
      TileProviderError.reportSuccess(this._errorEvent);
      this._image = image;
      this._tileWidth = image.width;
      this._tileHeight = image.height;
      this._ready = true;
      return true;
    });
  }
}

Object.defineProperties(SingleTileImageryProvider.prototype, {
  /**
   * Gets the URL of the single, top-level imagery tile.
   * @memberof SingleTileImageryProvider.prototype
   * @type {String}
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
   * @type {Number}
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
   * @type {Number}
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
   * @type {Number|undefined}
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
   * @type {Number}
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
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.ready",
        "SingleTileImageryProvider.ready was deprecated in CesiumJS 1.102.  It will be removed in 1.104. Use SingleTileImageryProvider.fromUrl instead."
      );
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.readyPromise",
        "SingleTileImageryProvider.readyPromise was deprecated in CesiumJS 1.102.  It will be removed in 1.104. Use SingleTileImageryProvider.fromUrl instead."
      );
      return this._readyPromise;
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
   * @type {Boolean}
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

  // When readyPromise is deprecated, TileProviderError.reportError,
  // retry attempts, and related parameters can be removed
  const reportedError = TileProviderError.reportError(
    previousError,
    provider,
    defined(provider) ? provider._errorEvent : undefined,
    message,
    0,
    0,
    0,
    error
  );
  if (reportedError.retry) {
    return doRequest(resource, provider, reportedError);
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
 * Creates a provider for a single, top-level imagery tile.  The single image is assumed to use a
 * @param {Resource|String} url The url for the tile
 * @param {SingleTileImageryProvider.ConstructorOptions} [options] Object describing initialization options.
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

  const provider = new SingleTileImageryProvider(options);
  provider._resource = resource;
  provider._image = image;
  provider._tileWidth = image.width;
  provider._tileHeight = image.height;
  provider._ready = true;
  provider._readyPromise = Promise.resolve(true);

  return provider;
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
SingleTileImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

/**
 * Requests the image for a given tile.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<ImageryTypes>|undefined} The resolved image
 */
SingleTileImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  if (!defined(this._image)) {
    return;
  }

  return Promise.resolve(this._image);
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
 * @return {undefined} Undefined since picking is not supported.
 */
SingleTileImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};
export default SingleTileImageryProvider;
