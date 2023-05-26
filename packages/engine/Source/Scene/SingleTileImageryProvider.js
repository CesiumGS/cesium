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

  this._hasError = false;
  this._errorEvent = new Event();

  this._ready = false;

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

  // After ready promise and the deprecation warning for these properties are removed,
  // the if check is not needed, and this can become a top-level block
  if (defined(options.tileWidth) || defined(options.tileHeight)) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("options.tileWidth", options.tileWidth);
    Check.typeOf.number("options.tileHeight", options.tileHeight);
    //>>includeEnd('debug');

    this._tileWidth = options.tileWidth;
    this._tileHeight = options.tileHeight;
    this._ready = true;
    this._readyPromise = Promise.resolve(true);
    return;
  }

  deprecationWarning(
    "SingleTileImageryProvider options",
    "options.tileHeight and options.tileWidth became required in CesiumJS 1.104. Omitting these properties will result in an error in 1.107. Provide options.tileHeight and options.tileWidth, or use SingleTileImageryProvider.fromUrl instead."
  );

  this._tileWidth = 0;
  this._tileHeight = 0;
  this._readyPromise = doRequest(resource, this).then((image) => {
    TileProviderError.reportSuccess(this._errorEvent);
    this._image = image;
    this._tileWidth = image.width;
    this._tileHeight = image.height;
    this._ready = true;
    return true;
  });
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
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof SingleTileImageryProvider.prototype
   * @type {boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.ready",
        "SingleTileImageryProvider.ready was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107. Use SingleTileImageryProvider.fromUrl instead."
      );
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Promise<boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.readyPromise",
        "SingleTileImageryProvider.readyPromise was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107. Use SingleTileImageryProvider.fromUrl instead."
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
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultAlpha: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultAlpha",
        "SingleTileImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      return this._defaultAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultAlpha",
        "SingleTileImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      this._defaultAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultNightAlpha: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultNightAlpha",
        "SingleTileImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      return this._defaultNightAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultNightAlpha",
        "SingleTileImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      this._defaultNightAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultDayAlpha: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultDayAlpha",
        "SingleTileImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      return this._defaultDayAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultDayAlpha",
        "SingleTileImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      this._defaultDayAlpha = value;
    },
  },

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultBrightness: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultBrightness",
        "SingleTileImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      return this._defaultBrightness;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultBrightness",
        "SingleTileImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      this._defaultBrightness = value;
    },
  },

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultContrast: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultContrast",
        "SingleTileImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      return this._defaultContrast;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultContrast",
        "SingleTileImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      this._defaultContrast = value;
    },
  },

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultHue: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultHue",
        "SingleTileImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      return this._defaultHue;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultHue",
        "SingleTileImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      this._defaultHue = value;
    },
  },

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultSaturation: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultSaturation",
        "SingleTileImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      return this._defaultSaturation;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultSaturation",
        "SingleTileImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      this._defaultSaturation = value;
    },
  },

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   * @memberof SingleTileImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultGamma: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultGamma",
        "SingleTileImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      return this._defaultGamma;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultGamma",
        "SingleTileImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      this._defaultGamma = value;
    },
  },

  /**
   * The default texture minification filter to apply to this provider.
   * @memberof SingleTileImageryProvider.prototype
   * @type {TextureMinificationFilter}
   * @deprecated
   */
  defaultMinificationFilter: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultMinificationFilter",
        "SingleTileImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      return this._defaultMinificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultMinificationFilter",
        "SingleTileImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      this._defaultMinificationFilter = value;
    },
  },

  /**
   * The default texture magnification filter to apply to this provider.
   * @memberof SingleTileImageryProvider.prototype
   * @type {TextureMagnificationFilter}
   * @deprecated
   */
  defaultMagnificationFilter: {
    get: function () {
      deprecationWarning(
        "SingleTileImageryProvider.defaultMagnificationFilter",
        "SingleTileImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      return this._defaultMagnificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "SingleTileImageryProvider.defaultMagnificationFilter",
        "SingleTileImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      this._defaultMagnificationFilter = value;
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
    error
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

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
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
  request
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
  latitude
) {
  return undefined;
};
export default SingleTileImageryProvider;
