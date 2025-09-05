import Credit from "../Core/Credit.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

const trailingSlashRegex = /\/$/;
const defaultCredit = new Credit(
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/">Improve this map</a></strong>',
);

/**
 * @typedef {object} Google2DImageryProvider.ConstructorOptions
 *
 * Initialization options for the Google2DImageryProvider constructor.
 * Google requires a session token to use the 2D Tiles api. You can fetch your own session token and provide it to the constructor, or you can
 * provide mapType, language and region and the imagery provider class will create your session token
 *
 * @property {Resource|string} [url='https://tile.googleapis.com/v1/2dtiles/'] The Google server url.
 * @property {string} apiKey the api key
 * @property {string} sessionToken The Google session token that tracks the current state of your map and viewport.
 * @property {string} mapType the type of basemap, accepted values are roadmap, satellite, terrain, & imagery
 * @property {string} language an IETF language tag that specifies the language used to display information on the tiles
 * @property {string} region A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @property {number} [tilesize=512] The size of the image tiles.
 * @property {boolean} [scaleFactor] Determines if tiles are rendered at a @2x scale factor.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
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
 * @alias Google2DImageryProvider
 * @constructor
 *
 * @param {Google2DImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Google 2D imagery provider
 * const mapbox = new Cesium.Google2DImageryProvider({
 *     apiKey: 'thisIsMyApiKey',
 *     sessionToken: 'thisIsSessionToken'
 * });
 *
 * @example
 * // Google 2D imagery provider
 * const mapbox = new Cesium.Google2DImageryProvider({
 *     apiKey: 'thisIsMyApiKey',
 *     mapType: "SATELLITE",
 *     language: "en_US",
 *     region: "US"
 * });
 *
 * @see {@link https://docs.mapbox.com/api/maps/#styles}
 * @see {@link https://docs.mapbox.com/api/#access-tokens-and-token-scopes}
 * @see {@link https://en.wikipedia.org/wiki/IETF_language_tag|IETF Language Tags}
 * @see {@link https://cldr.unicode.org/|Common Locale Data Repository region identifiers}
 */
function Google2DImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
}

Object.defineProperties(Google2DImageryProvider.prototype, {
  /**
   * Gets the URL of the Google 2D Imagery server.
   * @memberof Google2DImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._imageryProvider.url;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by the instance.
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
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
   * @memberof Google2DImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return this._imageryProvider.hasAlphaChannel;
    },
  },
});

Google2DImageryProvider.fromMapType = async function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.mapType)) {
    throw new DeveloperError("options.mapType is required.");
  }
  //>>includeEnd('debug');

  options = options ?? Frozen.EMPTY_OBJECT;

  const apiKey = options.apiKey;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(apiKey)) {
    throw new DeveloperError("options.apiKey is required.");
  }
  //>>includeEnd('debug');

  if (!defined(options.sessionToken)) {
    const sessionJson = await createGoogleImagerySession(options);
    this._sessionToken = sessionJson.session;
    this._tileWidth = sessionJson.tileWidth;
    this._tileHeight = sessionJson.tileHeight;
  }

  const resource = Resource.createIfNeeded(
    options.url ?? "https://tile.googleapis.com/v1/2dtiles/",
  );

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }
  //templateUrl += `${this._username}/${styleId}/tiles/${this._tilesize}/{z}/{x}/{y}${scaleFactor}`;
  //templateUrl += `{z}/{x}/{y}?session=${this._sessionToken}&key=${this.apiKey}`;
  templateUrl += `{z}/{x}/{y}`;

  resource.url = templateUrl;

  resource.setQueryParameters({
    session: this._sessionToken,
    key: apiKey,
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

  const provider = new UrlTemplateImageryProvider({
    url: resource,
    credit: credit,
    // ellipsoid: options.ellipsoid,
    // minimumLevel: options.minimumLevel,
    tileWidth: this._tileWidth,
    tileHeight: this._tileHeight,
    maximumLevel: 22,
    //rectangle: options.rectangle,
  });
  provider._resource = resource;
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
Google2DImageryProvider.prototype.getTileCredits = function (x, y, level) {
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
Google2DImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request,
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
Google2DImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  return this._imageryProvider.pickFeatures(x, y, level, longitude, latitude);
};

async function createGoogleImagerySession(options) {
  const { mapType, language, region, apiKey } = options;
  const response = await Resource.post({
    url: "https://tile.googleapis.com/v1/createSession",
    queryParameters: { key: apiKey },
    data: JSON.stringify({
      mapType: mapType,
      language: language,
      region: region,
    }),
  });
  const responseJson = JSON.parse(response);
  return responseJson;
}

// Exposed for tests
Google2DImageryProvider._defaultCredit = defaultCredit;
export default Google2DImageryProvider;
