import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

const trailingSlashRegex = /\/$/;
const defaultCredit = new Credit(
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/">Improve this map</a></strong>'
);

/**
 * @typedef {object} MapboxStyleImageryProvider.ConstructorOptions
 *
 * Initialization options for the MapboxStyleImageryProvider constructor
 *
 * @property {Resource|string} [url='https://api.mapbox.com/styles/v1/'] The Mapbox server url.
 * @property {string} [username='mapbox'] The username of the map account.
 * @property {string} styleId The Mapbox Style ID.
 * @property {string} accessToken The public access token for the imagery.
 * @property {number} [tilesize=512] The size of the image tiles.
 * @property {boolean} [scaleFactor] Determines if tiles are rendered at a @2x scale factor.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * Provides tiled imagery hosted by Mapbox.
 *
 * @alias MapboxStyleImageryProvider
 * @constructor
 *
 * @param {MapboxStyleImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Mapbox style provider
 * const mapbox = new Cesium.MapboxStyleImageryProvider({
 *     styleId: 'streets-v11',
 *     accessToken: 'thisIsMyAccessToken'
 * });
 *
 * @see {@link https://docs.mapbox.com/api/maps/#styles}
 * @see {@link https://docs.mapbox.com/api/#access-tokens-and-token-scopes}
 */
function MapboxStyleImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const styleId = options.styleId;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(styleId)) {
    throw new DeveloperError("options.styleId is required.");
  }
  //>>includeEnd('debug');

  const accessToken = options.accessToken;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(accessToken)) {
    throw new DeveloperError("options.accessToken is required.");
  }
  //>>includeEnd('debug');

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

  const resource = Resource.createIfNeeded(
    defaultValue(options.url, "https://api.mapbox.com/styles/v1/")
  );

  this._styleId = styleId;
  this._accessToken = accessToken;

  const tilesize = defaultValue(options.tilesize, 512);
  this._tilesize = tilesize;

  const username = defaultValue(options.username, "mapbox");
  this._username = username;

  const scaleFactor = defined(options.scaleFactor) ? "@2x" : "";

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }
  templateUrl += `${this._username}/${styleId}/tiles/${this._tilesize}/{z}/{x}/{y}${scaleFactor}`;
  resource.url = templateUrl;

  resource.setQueryParameters({
    access_token: accessToken,
  });

  let credit;
  if (defined(options.credit)) {
    credit = options.credit;
    if (typeof credit === "string") {
      credit = new Credit(credit);
    }
  } else {
    credit = defaultCredit;
  }

  this._resource = resource;
  this._imageryProvider = new UrlTemplateImageryProvider({
    url: resource,
    credit: credit,
    ellipsoid: options.ellipsoid,
    minimumLevel: options.minimumLevel,
    maximumLevel: options.maximumLevel,
    rectangle: options.rectangle,
  });

  this._ready = true;
  this._readyPromise = Promise.resolve(true);
}

Object.defineProperties(MapboxStyleImageryProvider.prototype, {
  /**
   * Gets the URL of the Mapbox server.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._imageryProvider.url;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.ready",
        "MapboxStyleImageryProvider.ready was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107."
      );
      return this._imageryProvider.ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Promise<boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.readyPromise",
        "MapboxStyleImageryProvider.readyPromise was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107."
      );
      return this._imageryProvider.readyPromise;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by the instance.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._imageryProvider.rectangle;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._imageryProvider.tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._imageryProvider.tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._imageryProvider.maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested. Generally,
   * a minimum level should only be used when the rectangle of the imagery is small
   * enough that the number of tiles at the minimum level is small.  An imagery
   * provider with more than a few tiles at the minimum level will lead to
   * rendering problems.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return this._imageryProvider.minimumLevel;
    },
  },

  /**
   * Gets the tiling scheme used by the provider.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._imageryProvider.tilingScheme;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return this._imageryProvider.tileDiscardPolicy;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error..  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._imageryProvider.errorEvent;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._imageryProvider.credit;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._imageryProvider.proxy;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return this._imageryProvider.hasAlphaChannel;
    },
  },

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultAlpha: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultAlpha",
        "MapboxStyleImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      return this._defaultAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultAlpha",
        "MapboxStyleImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      this._defaultAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultNightAlpha: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultNightAlpha",
        "MapboxStyleImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      return this._defaultNightAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultNightAlpha",
        "MapboxStyleImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      this._defaultNightAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultDayAlpha: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultDayAlpha",
        "MapboxStyleImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      return this._defaultDayAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultDayAlpha",
        "MapboxStyleImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      this._defaultDayAlpha = value;
    },
  },

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultBrightness: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultBrightness",
        "MapboxStyleImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      return this._defaultBrightness;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultBrightness",
        "MapboxStyleImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      this._defaultBrightness = value;
    },
  },

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultContrast: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultContrast",
        "MapboxStyleImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      return this._defaultContrast;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultContrast",
        "MapboxStyleImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      this._defaultContrast = value;
    },
  },

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultHue: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultHue",
        "MapboxStyleImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      return this._defaultHue;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultHue",
        "MapboxStyleImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      this._defaultHue = value;
    },
  },

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultSaturation: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultSaturation",
        "MapboxStyleImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      return this._defaultSaturation;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultSaturation",
        "MapboxStyleImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      this._defaultSaturation = value;
    },
  },

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultGamma: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultGamma",
        "MapboxStyleImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      return this._defaultGamma;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultGamma",
        "MapboxStyleImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      this._defaultGamma = value;
    },
  },

  /**
   * The default texture minification filter to apply to this provider.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {TextureMinificationFilter}
   * @deprecated
   */
  defaultMinificationFilter: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultMinificationFilter",
        "MapboxStyleImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      return this._defaultMinificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultMinificationFilter",
        "MapboxStyleImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      this._defaultMinificationFilter = value;
    },
  },

  /**
   * The default texture magnification filter to apply to this provider.
   * @memberof MapboxStyleImageryProvider.prototype
   * @type {TextureMagnificationFilter}
   * @deprecated
   */
  defaultMagnificationFilter: {
    get: function () {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultMagnificationFilter",
        "MapboxStyleImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      return this._defaultMagnificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "MapboxStyleImageryProvider.defaultMagnificationFilter",
        "MapboxStyleImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      this._defaultMagnificationFilter = value;
    },
  },
});

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
MapboxStyleImageryProvider.prototype.getTileCredits = function (x, y, level) {
  return undefined;
};

/**
 * Requests the image for a given tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<ImageryTypes>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
MapboxStyleImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  return this._imageryProvider.requestImage(x, y, level, request);
};

/**
 * Asynchronously determines what features, if any, are located at a given longitude and latitude within
 * a tile. This function is optional, so it may not exist on all ImageryProviders.
 *
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {number} longitude The longitude at which to pick features.
 * @param {number} latitude  The latitude at which to pick features.
 * @return {Promise<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
 *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
 *                   instances.  The array may be empty if no features are found at the given location.
 *                   It may also be undefined if picking is not supported.
 */
MapboxStyleImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return this._imageryProvider.pickFeatures(x, y, level, longitude, latitude);
};

// Exposed for tests
MapboxStyleImageryProvider._defaultCredit = defaultCredit;
export default MapboxStyleImageryProvider;
