import Credit from "../Core/Credit.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import IonResource from "../Core/IonResource.js";
//import Rectangle from "../Core/Rectangle.js";
import Check from "../Core/Check.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import TileAvailability from "../Core/TileAvailability.js";
//import CesiumMath from "../Core/Math.js";
//import Cartographic from "../Core/Cartographic.js";

const trailingSlashRegex = /\/$/;

/**
 * @typedef {Object} Google2DImageryProvider.ConstructorOptions
 *
 * Initialization options for the Google2DImageryProvider constructor
 *
 * @property {object} options Object with the following properties:
 * @property {string} options.key the Google api key
 * @property {string} options.session The Google session token that tracks the current state of your map and viewport.
 * @property {(string|IonResource)} options.url The url for the google API tile service, or IonResource for the ion proxy endpoint.
 * @property {string} options.tileWidth The width of each tile in pixels.
 * @property {string} options.tileHeight The height of each tile in pixels.
 * @property {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @property {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider({
 *     key: 'thisIsMyApiKey',
 *     session: 'thisIsSessionToken'
 * });
 *
 */

/**
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link Google2DImageryProvider.fromIon} or {@link Google2DImageryProvider.fromUrl}.
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
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromIon({
 *     assetId: 1687
 * });
  * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromUrl({
 *     key: 'thisIsMyApiKey',
 *     mapType: "SATELLITE"
 * });
 *

 *
 * @see {@link https://developers.google.com/maps/documentation/tile/2d-tiles-overview}
 * @see {@link https://developers.google.com/maps/documentation/tile/session_tokens}
 * @see {@link https://en.wikipedia.org/wiki/IETF_language_tag|IETF Language Tags}
 * @see {@link https://cldr.unicode.org/|Common Locale Data Repository region identifiers}
 */

function Google2DImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._maximumLevel = options.maximumLevel ?? 22;

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

  this._session = options.session;
  this._key = options.key;
  this._tileWidth = options.tileWidth;
  this._tileHeight = options.tileHeight;

  const resource =
    options.url instanceof IonResource
      ? options.url
      : Resource.createIfNeeded(options.url ?? "https://tile.googleapis.com");

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }
  const tilesUrl = `${templateUrl}v1/2dtiles/{z}/{x}/{y}`;
  this._viewportUrl = `${templateUrl}tile/v1/viewport`;

  resource.url = tilesUrl;

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
    ellipsoid: options.ellipsoid,
    rectangle: options.rectangle,
    maximumLevel: this._maximumLevel,
  });
  provider._resource = resource;
  this._imageryProvider = provider;

  getViewportCredits({
    viewportUrl: this._viewportUrl,
    key: this._key,
    session: this._session,
    maximumLevel: this._maximumLevel,
  }).then((data) => {
    this._imageryProvider._credit = new Credit(data);
  });

  this._tilingScheme = this._imageryProvider._tilingScheme;
  this._tileAvailability = new TileAvailability(
    this._imageryProvider._tilingScheme,
    this._maximumLevel,
  );
  this._tileAvailabilityComplete = new TileAvailability(
    this._imageryProvider._tilingScheme,
    this._maximumLevel,
  );

  return;
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
 * @param {string} options.assetId The assetId to call in Cesium ion. This must be an Imagery asset with externalType = "GOOGLE_2D_MAPS".
 * @param {"satellite" | "terrain" | "roadmap"} [options.mapType="satellite"] The map type of the Google map imagery. Valid options are satellite, terrain, and roadmap. If overlayLayerType is set, mapType is ignored and a transparent overlay is returned. If overlayMapType is undefined, then a basemap of mapType is returned. layerRoadmap overlayLayerType is included in terrain and roadmap mapTypes.
 * @param {string} [options.language='en_US'] an IETF language tag that specifies the language used to display information on the tiles
 * @param {string} [options.region='US'] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @param {"layerRoadmap" | "layerStreetview" | "layerTraffic"} [options.overlayLayerType=undefined] Returns a transparent overlay map with the specified layerType. If no value is provided, a basemap of mapType is returned. Use multiple instances of Google2DImageryProvider to add multiple Google Maps overlays to a scene. layerRoadmap is included in terrain and roadmap mapTypes, so adding as overlay to terrain or roadmap has no effect.
 * @param {Object} [options.styles] An array of JSON style objects that specify the appearance and detail level of map features such as roads, parks, and built-up areas. Styling is used to customize the standard Google base map. The styles parameter is valid only if the mapType is roadmap. For the complete style syntax, see the ({@link https://developers.google.com/maps/documentation/tile/style-reference|Google Style Reference}).
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @param {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @param {number} [options.maximumLevel=22] The maximum level-of-detail supported by the imagery provider.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<Google2DImageryProvider>} A promise that resolves to the created Google2DImageryProvider.
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromIon({
 *     assetId: 1687
 * });
 */

Google2DImageryProvider.fromIon = async function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  options.mapType = options.mapType ?? "satellite";
  options.language = options.language ?? "en_US";
  options.region = options.region ?? "US";

  const overlayLayerType = options.overlayLayerType;
  //>>includeStart('debug', pragmas.debug);
  if (defined(overlayLayerType)) {
    Check.typeOf.string("overlayLayerType", overlayLayerType);
  }
  if (!defined(options.assetId)) {
    throw new DeveloperError("options.assetId is required.");
  }
  //>>includeEnd('debug');

  const endpointJson = await createIonImagerySession(options);

  const endpointOptions = { ...endpointJson.options };
  const url = endpointOptions.url;
  delete endpointOptions.url;

  return new Google2DImageryProvider({
    session: endpointOptions.session,
    key: endpointOptions.key,
    tileWidth: endpointOptions.tileWidth,
    tileHeight: endpointOptions.tileHeight,
    url,
  });
};

/**
 * Creates an {@link ImageryProvider} which provides 2D global tiled imagery from Google.
 * @param {object} options Object with the following properties:
 * @param {string} options.assetId The assetId to call in Cesium ion. This must be an Imagery asset with externalType = "GOOGLE_2D_MAPS".
 * @param {string} options.key The Google api key
 * @param {"satellite" | "terrain" | "roadmap"} [options.mapType="satellite"] The map type of the Google map imagery. Valid options are satellite, terrain, and roadmap. If overlayLayerType is set, mapType is ignored and a transparent overlay is returned. If overlayMapType is undefined, then a basemap of mapType is returned. layerRoadmap overlayLayerType is included in terrain and roadmap mapTypes.
 * @param {string} [options.language='en_US'] an IETF language tag that specifies the language used to display information on the tiles
 * @param {string} [options.region='US'] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @param {"layerRoadmap" | "layerStreetview" | "layerTraffic"} [options.overlayLayerType=undefined] Returns a transparent overlay map with the specified layerType. If no value is provided, a basemap of mapType is returned. Use multiple instances of Google2DImageryProvider to add multiple Google Maps overlays to a scene. layerRoadmap is included in terrain and roadmap mapTypes, so adding as overlay to terrain or roadmap has no effect.
 * @param {Object} [options.styles] An array of JSON style objects that specify the appearance and detail level of map features such as roads, parks, and built-up areas. Styling is used to customize the standard Google base map. The styles parameter is valid only if the mapType is roadmap. For the complete style syntax, see the ({@link https://developers.google.com/maps/documentation/tile/style-reference|Google Style Reference}).
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @param {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @param {number} [options.maximumLevel=22] The maximum level-of-detail supported by the imagery provider.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<Google2DImageryProvider>} A promise that resolves to the created Google2DImageryProvider.
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromUrl({
 *     apiKey: 'thisIsMyApiKey',
 *     mapType: "satellite"
 * });
 */

Google2DImageryProvider.fromUrl = async function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  options.mapType = options.mapType ?? "satellite";
  options.language = options.language ?? "en_US";
  options.region = options.region ?? "US";

  const overlayLayerType = options.overlayLayerType;
  //>>includeStart('debug', pragmas.debug);
  if (defined(overlayLayerType)) {
    Check.typeOf.string("overlayLayerType", overlayLayerType);
  }
  if (!defined(options.key)) {
    throw new DeveloperError("options.key is required.");
  }
  //>>includeEnd('debug');

  const sessionJson = await createGoogleImagerySession(options);

  return new Google2DImageryProvider({
    session: sessionJson.session,
    tileWidth: sessionJson.tileWidth,
    tileHeight: sessionJson.tileHeight,
    ...options,
  });
};

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
  return undefined;
};

//const rectangleScratch = new Rectangle();

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
  // const isAvailable = this._tileAvailability.isTileAvailable(level, x, y);
  // if (isAvailable) {
  //   ;
  // }

  // const isAvailabilityComplete = this._tileAvailabilityComplete.isTileAvailable(
  //   level,
  //   x,
  //   y,
  // );
  // if (isAvailabilityComplete) {
  //   return undefined;
  // }

  // const rectangle = this._tilingScheme.tileXYToRectangle(
  //   x,
  //   y,
  //   level,
  //   rectangleScratch,
  // );

  // const viewport = await Resource.fetch({
  //   url: this._viewportUrl,
  //   queryParameters: {
  //     key: this._key,
  //     session: this._session,
  //     zoom: level,
  //     north: CesiumMath.toDegrees(rectangle.north),
  //     south: CesiumMath.toDegrees(rectangle.south),
  //     east: CesiumMath.toDegrees(rectangle.east),
  //     west: CesiumMath.toDegrees(rectangle.west),
  //   },
  //   data: JSON.stringify({}),
  // });
  // const viewportJson = JSON.parse(viewport);

  // const maxRectCount = viewportJson.maxZoomRects.length;

  // const webMercatorLatLimit = 85; //85.05112878;

  // for (
  //   let rectangleIndex = 0;
  //   rectangleIndex < maxRectCount;
  //   rectangleIndex++
  // ) {
  //   const maxZoomRect = viewportJson.maxZoomRects[rectangleIndex];

  //   // ToDo: scratch variable
  //   const topLeftCorner = new Cartographic.fromDegrees(
  //     maxZoomRect.west,
  //     Math.min(maxZoomRect.north, webMercatorLatLimit),
  //   );
  //   const bottomRightCorner = new Cartographic.fromDegrees(
  //     maxZoomRect.east,
  //     Math.max(maxZoomRect.south, -webMercatorLatLimit),
  //   );

  //   const minCornerXY = this._tilingScheme.positionToTileXY(
  //     topLeftCorner,
  //     maxZoomRect.maxZoom,
  //   );
  //   const maxCornerXY = this._tilingScheme.positionToTileXY(
  //     bottomRightCorner,
  //     maxZoomRect.maxZoom,
  //   );

  //   this._tileAvailability.addAvailableTileRange(
  //     maxZoomRect.maxZoom,
  //     minCornerXY.x,
  //     minCornerXY.y,
  //     maxCornerXY.x,
  //     maxCornerXY.y,
  //   );
  // }
  // if (maxRectCount < 100) {
  //   this._tileAvailabilityComplete.addAvailableTileRange(level, x, y, x, y);
  // }
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

async function fetchViewportAttribution(options) {
  const { viewportUrl, key, session, level } = options;
  const viewport = await Resource.fetch({
    url: viewportUrl,
    queryParameters: {
      key,
      session,
      zoom: level,
      north: 90,
      south: -90,
      east: 180,
      west: -180,
    },
    data: JSON.stringify({}),
  });
  const viewportJson = JSON.parse(viewport);
  return viewportJson.copyright;
}

async function getViewportCredits(options) {
  const attribution = new Set();
  const { maximumLevel } = options;
  const promises = [];
  for (let level = 0; level < maximumLevel + 1; level++) {
    promises.push(
      fetchViewportAttribution({
        ...options,
        level,
      }),
    );
  }
  const results = await Promise.all(promises);

  results.forEach((result) =>
    result.split(",").forEach((source) => {
      if (source.trim()) {
        attribution.add(source.trim());
      }
    }),
  );
  return [...attribution].join(", ");
}

function buildQueryOptions(options) {
  const { mapType, overlayLayerType, styles } = options;

  const queryOptions = {
    mapType,
    overlay: false,
  };

  if (mapType === "terrain" && !defined(overlayLayerType)) {
    queryOptions.layerTypes = ["layerRoadmap"];
  }

  if (defined(overlayLayerType)) {
    queryOptions.mapType = "satellite";
    queryOptions.overlay = true;
    queryOptions.layerTypes = [overlayLayerType];
  }
  if (defined(styles)) {
    queryOptions.styles = styles;
  }
  return queryOptions;
}

async function createGoogleImagerySession(options) {
  const { language, region, key } = options;

  const queryOptions = buildQueryOptions(options);

  const response = await Resource.post({
    url: "https://tile.googleapis.com/v1/createSession",
    queryParameters: { key: key },
    data: JSON.stringify({
      ...queryOptions,
      language,
      region,
    }),
  });
  const responseJson = JSON.parse(response);
  return responseJson;
}

async function createIonImagerySession(options) {
  const { assetId } = options;

  const queryOptions = buildQueryOptions(options);

  const endpointResource = IonResource._createEndpointResource(assetId, {
    queryParameters: {
      options: JSON.stringify(queryOptions),
    },
  });

  const endpoint = await endpointResource.fetchJson();
  return endpoint;
}

// exposed for testing
Google2DImageryProvider._endpointCache = {};
export default Google2DImageryProvider;
