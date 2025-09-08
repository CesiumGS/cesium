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
 * @property {string} apiKey the Google api key
 * @property {string} sessionToken The Google session token that tracks the current state of your map and viewport.
 * @property {string} mapType the type of basemap, accepted values are roadmap, satellite, terrain, & imagery
 * @property {string} [language='en_US'] an IETF language tag that specifies the language used to display information on the tiles
 * @property {string} [region='US'] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @property {string} [imageFormat] The file format to return. Valid values are either jpeg or png. If you don't specify an imageFormat, then the best format for the tile is chosen automatically by the Google tile service.
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
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link Google2DImageryProvider.fromMapType} or {@link Google2DImageryProvider.fromSessionToken}.
 * </div>
 *
 *
 * Provides 2D image tiles from Google.
 *
 * @alias Google2DImageryProvider
 * @constructor
 *
 * @param {Google2DImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromSessionToken({
 *     apiKey: 'thisIsMyApiKey',
 *     sessionToken: 'thisIsSessionToken'
 * });
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromMapType({
 *     apiKey: 'thisIsMyApiKey',
 *     mapType: "SATELLITE",
 *     language: "en_US",
 *     region: "US"
 * });
 *
 * @see {@link https://developers.google.com/maps/documentation/tile/2d-tiles-overview}
 * @see {@link https://developers.google.com/maps/documentation/tile/session_tokens}
 * @see {@link https://en.wikipedia.org/wiki/IETF_language_tag|IETF Language Tags}
 * @see {@link https://cldr.unicode.org/|Common Locale Data Repository region identifiers}
 */
function Google2DImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._sessionToken = options.sessionToken;
  this._tileWidth = options.tileWidth;
  this._tileHeight = options.tileHeight;
  this._imageFormat = options.imageFormat;
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

/**
 * Creates an {@link ImageryProvider} which provides 2D global tiled imagery from Google.
 * @param {Google2DImageryMapType} mapType The map type of the Google map imagery. Valid options are {@link ArcGisBaseMapType.SATELLITE}, {@link ArcGisBaseMapType.OCEANS}, and {@link ArcGisBaseMapType.HILLSHADE}.
 * @param {object} options Object with the following properties:
 * @property {string} apiKey the Google api key
 * @property {string} sessionToken The Google session token that tracks the current state of your map and viewport.
 * @property {number} [tilesize=512] The size of the image tiles.
 * @property {boolean} [scaleFactor] Determines if tiles are rendered at a @2x scale factor.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @property {number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.


* @param {Google2DImageryProvider.ConstructorOptions} [options] Object describing initialization options.
 * @returns {Promise<Google2DImageryProvider>} A promise that resolves to the created Google2DImageryProvider.
 *
 * @example
 * // Set the default access token for accessing ArcGIS Image Tile service
 * Cesium.ArcGisMapService.defaultAccessToken = "<ArcGIS Access Token>";
 *
 * // Add a base layer from a default ArcGIS basemap
 * const provider = await Cesium.ArcGisMapServerImageryProvider.fromBasemapType(
 *   Cesium.ArcGisBaseMapType.SATELLITE);
 *
 * @example
 * // Add a base layer from a default ArcGIS Basemap
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   baseLayer: Cesium.ImageryLayer.fromProviderAsync(
 *     Cesium.Google2DImageryProvider.fromMapType(
 *       Cesium.Google2DMapType.HILLSHADE, {
 *         token: "<Google 2D tiles Access Token>"
 *       }
 *     )
 *   ),
 * });
 */

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

  //>>includeStart('debug', pragmas.debug);
  if (defined(options.sessionToken)) {
    throw new DeveloperError(
      "use Google2DImageryProvider.fromSessionToken if you have a valid session token",
    );
  }
  //>>includeEnd('debug');

  const sessionJson = await createGoogleImagerySession(options);

  return Google2DImageryProvider.fromSessionToken({
    sessionToken: sessionJson.session,
    apiKey: options.apiKey,
    tileWidth: sessionJson.tileWidth,
    tileHeight: sessionJson.tileHeight,
    imageFormat: sessionJson.imageFormat,
    ...options,
  });
};

/**
 * Creates an {@link ImageryProvider} which provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
 * used, if available.
 *
 * @param {object} options Object with the following properties:
 * @property {string} mapType the type of basemap, accepted values are roadmap, satellite, terrain, & imagery
 * @property {string} [language='en_US'] an IETF language tag that specifies the language used to display information on the tiles
 * @param {ArcGisMapServerImageryProvider.ConstructorOptions} [options] Object describing initialization options.
 * @returns {Promise<ArcGisMapServerImageryProvider>} A promise that resolves to the created ArcGisMapServerImageryProvider.
 *
 * @example
 * const esri = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
 *     "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
 * );
 *
 * @exception {RuntimeError} metadata spatial reference specifies an unknown WKID
 * @exception {RuntimeError} metadata fullExtent.spatialReference specifies an unknown WKID
 */

Google2DImageryProvider.fromSessionToken = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.sessionToken)) {
    throw new DeveloperError("options.sessionToken is required.");
  }
  //>>includeEnd('debug');

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.tileWidth)) {
    throw new DeveloperError("options.tileWidth is required.");
  }
  //>>includeEnd('debug');

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.tileHeight)) {
    throw new DeveloperError("options.tileHeight is required.");
  }
  //>>includeEnd('debug');

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.imageFormat)) {
    throw new DeveloperError("options.imageFormat is required.");
  }
  //>>includeEnd('debug');

  const apiKey = options.apiKey;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(apiKey)) {
    throw new DeveloperError("options.apiKey is required.");
  }
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(
    options.url ?? "https://tile.googleapis.com/v1/2dtiles/",
  );

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }
  templateUrl += `{z}/{x}/{y}`;

  resource.url = templateUrl;

  resource.setQueryParameters({
    session: options.sessionToken,
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
    tileWidth: this._tileWidth,
    tileHeight: this._tileHeight,
    maximumLevel: 22,
    ellipsoid: options.ellipsoid,
    rectangle: options.rectangle,
  });
  provider._resource = resource;

  const imageryProvider = new Google2DImageryProvider(options);
  imageryProvider._imageryProvider = provider;
  return imageryProvider;
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
      mapType,
      language,
      region,
    }),
  });
  const responseJson = JSON.parse(response);
  return responseJson;
}

// Exposed for tests
Google2DImageryProvider._defaultCredit = defaultCredit;
export default Google2DImageryProvider;
