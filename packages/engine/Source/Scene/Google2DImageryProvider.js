import Credit from "../Core/Credit.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import IonResource from "../Core/IonResource.js";
//import Rectangle from "../Core/Rectangle.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

const trailingSlashRegex = /\/$/;

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
  this._session = options.session;
  this._key = options.key;
  this._tileWidth = options.tileWidth;
  this._tileHeight = options.tileHeight;
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
 * @param {object} options Object with the following properties:
 * @param {Google2DImageryMapType} options.mapType The map type of the Google map imagery. Valid options are {@link ArcGisBaseMapType.SATELLITE}, {@link ArcGisBaseMapType.OCEANS}, and {@link ArcGisBaseMapType.HILLSHADE}.
 * @param {string} options.apiKey the Google api key
 * @param {string} [options.language='en_US'] an IETF language tag that specifies the language used to display information on the tiles
 * @param {string} [options.region='US'] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @param {string} [options.imageFormat] The file format to return. Valid values are either jpeg or png. If you don't specify an imageFormat, then the best format for the tile is chosen automatically by the Google tile service.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @param {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @param {number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @param {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<Google2DImageryProvider>} A promise that resolves to the created Google2DImageryProvider.
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromMapType({
 *     apiKey: 'thisIsMyApiKey',
 *     mapType: "SATELLITE",
 *     language: "en_US",
 *     region: "US"
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
    ...options,
  });
};

/**
 * Creates an {@link ImageryProvider} which provides 2D global tiled imagery from Google.
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.apiKey the Google api key
 * @param {string} options.sessionToken The Google session token that tracks the current state of your map and viewport.
 * @param {string} options.tileWidth The width of each tile in pixels.
 * @param {string} options.tileHeight The height of each tile in pixels.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @param {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @param {number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 *
 * @returns {Promise<Google2DImageryProvider>} A promise that resolves to the created Google2DImageryProvider.
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromSessionToken({
 *     apiKey: 'thisIsMyApiKey',
 *     sessionToken: 'thisIsSessionToken'
 * });
 *
 */

Google2DImageryProvider.fromSessionToken = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.session)) {
    throw new DeveloperError("options.session is required.");
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
  if (!defined(options.key)) {
    throw new DeveloperError("options.key is required.");
  }
  //>>includeEnd('debug');

  //>>includeStart('debug', pragmas.debug);
  if (!(options.url instanceof IonResource)) {
    throw new DeveloperError("options.url must be IonResource.");
  }
  //>>includeEnd('debug');

  const resource = options.url;

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }
  templateUrl += `v1/2dtiles/{z}/{x}/{y}`;

  resource.url = templateUrl;

  resource.setQueryParameters({
    session: encodeURIComponent(options.session),
    key: encodeURIComponent(options.key),
  });

  let credit;
  if (defined(options.credit)) {
    credit = options.credit;
    if (typeof credit === "string") {
      credit = new Credit(credit);
    }
  }

  const provider = new UrlTemplateImageryProvider({
    url: resource,
    credit: credit,
    tileWidth: options.tileWidth,
    tileHeight: options.tileHeight,
    maximumLevel: 22,
    ellipsoid: options.ellipsoid,
    rectangle: options.rectangle,
  });
  provider._resource = resource;

  const imageryProvider = new Google2DImageryProvider(options);
  imageryProvider._imageryProvider = provider;
  return imageryProvider;
};

//const rectangleScratch = new Rectangle();

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
Google2DImageryProvider.prototype.getTileCredits = async function (
  x,
  y,
  level,
) {
  return "doop";
  // const rectangle = this._imageryProvider._tilingScheme.tileXYToRectangle(
  //   x,
  //   y,
  //   level,
  //   rectangleScratch,
  // );
  // console.log("rectangle --> ", rectangle);
  // console.log("this --> ", this);
  // //const { mapType, language, region, apiKey } = options;

  // //curl "https://tile.googleapis.com/tile/v1/viewport?session=YOUR_SESSION_TOKEN&key=YOUR_API_KEY&zoom=zoom&north=north&south=south&east=east&west=west"

  // const response = await Resource.post({
  //   url: "https://tile.googleapis.com/tile/v1/viewport",
  //   queryParameters: {
  //     session: this._sessionToken,
  //     key: this._apiKey,
  //     zoom: level,
  //     north: rectangle.north,
  //     south: rectangle.south,
  //     east: rectangle.east,
  //     west: rectangle.west,
  //   },
  //   data: JSON.stringify({}),
  // });
  // const responseJson = JSON.parse(response);
  // return responseJson.copyright;
  //return undefined;
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
Google2DImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  return undefined;
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

export default Google2DImageryProvider;
