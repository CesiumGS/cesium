import Credit from "../Core/Credit.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import IonResource from "../Core/IonResource.js";
import Check from "../Core/Check.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import GoogleMaps from "../Core/GoogleMaps.js";

const trailingSlashRegex = /\/$/;

/**
 * @typedef {Object} Google2DImageryProvider.ConstructorOptions
 *
 * Initialization options for the Google2DImageryProvider constructor
 *
 * @property {object} options Object with the following properties:
 * @property {string} options.key The Google api key to send with tile requests.
 * @property {string} options.session The Google session token that tracks the current state of your map and viewport.
 * @property {string|Resource|IonResource} options.url The Google 2D maps endpoint.
 * @property {string} options.tileWidth The width of each tile in pixels.
 * @property {string} options.tileHeight The height of each tile in pixels.
 * @property {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @property {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {number} [options.maximumLevel=22] The maximum level-of-detail supported by the imagery provider.
 * @property {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 */

/**
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link Google2DImageryProvider.fromIonAssetId} or {@link Google2DImageryProvider.fromUrl}.
 * </div>
 *
 *
 * Provides 2D image tiles from {@link https://developers.google.com/maps/documentation/tile/2d-tiles-overview|Google 2D Tiles}.
 * 
 * Google 2D Tiles can only be used with the Google geocoder.
 *
 * @alias Google2DImageryProvider
 * @constructor
 *
 * @param {Google2DImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Google 2D imagery provider
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromIonAssetId({
 *     assetId: 3830184
 * });
  * @example
 * // Use your own Google api key
 * Cesium.GoogleMaps.defaultApiKey = "your-api-key";
 * 
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromUrl({
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
  this._minimumLevel = options.minimumLevel ?? 0;

  //>>includeStart("debug", pragmas.debug);
  Check.defined("options.session", options.session);
  Check.defined("options.tileWidth", options.tileWidth);
  Check.defined("options.tileHeight", options.tileHeight);
  Check.defined("options.key", options.key);
  //>>includeEnd("debug");

  this._session = options.session;
  this._key = options.key;
  this._tileWidth = options.tileWidth;
  this._tileHeight = options.tileHeight;

  const resource =
    options.url instanceof IonResource
      ? options.url
      : Resource.createIfNeeded(options.url ?? GoogleMaps.mapTilesApiEndpoint);

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
    minimumLevel: this._minimumLevel,
  });
  provider._resource = resource;
  this._imageryProvider = provider;

  // This will be defined for ion resources
  this._tileCredits = resource.credits;
  this._attributionsByLevel = undefined;
  // Asynchronously request and populate _attributionsByLevel
  this.getViewportCredits();
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
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
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
 * Creates an {@link ImageryProvider} which provides 2D global tiled imagery from {@link https://developers.google.com/maps/documentation/tile/2d-tiles-overview|Google 2D Tiles}, streamed using the Cesium ion REST API.
 * @param {object} options Object with the following properties:
 * @param {string} options.assetId The Cesium ion asset id.
 * @param {"satellite" | "terrain" | "roadmap"} [options.mapType="satellite"] The map type of the Google map imagery. Valid options are satellite, terrain, and roadmap. If overlayLayerType is set, mapType is ignored and a transparent overlay is returned. If overlayMapType is undefined, then a basemap of mapType is returned. layerRoadmap overlayLayerType is included in terrain and roadmap mapTypes.
 * @param {string} [options.language="en_US"] an IETF language tag that specifies the language used to display information on the tiles
 * @param {string} [options.region="US"] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @param {"layerRoadmap" | "layerStreetview" | "layerTraffic"} [options.overlayLayerType] Returns a transparent overlay map with the specified layerType. If no value is provided, a basemap of mapType is returned. Use multiple instances of Google2DImageryProvider to add multiple Google Maps overlays to a scene. layerRoadmap is included in terrain and roadmap mapTypes, so adding as overlay to terrain or roadmap has no effect.
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
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromIonAssetId({
 *     assetId: 3830184
 * });
 * @example
 * // Google 2D roadmap overlay with custom styles
 * const googleTileProvider = Cesium.Google2DImageryProvider.fromIonAssetId({
 *     assetId: 3830184,
 *     overlayLayerType: "layerRoadmap",
 *     styles: [
 *         {
 *             stylers: [{ hue: "#00ffe6" }, { saturation: -20 }],
 *         },
 *         {
 *             featureType: "road",
 *             elementType: "geometry",
 *             stylers: [{ lightness: 100 }, { visibility: "simplified" }],
 *         },
 *     ],
 * });
 */
Google2DImageryProvider.fromIonAssetId = async function (options) {
  options = options ?? {};
  options.mapType = options.mapType ?? "satellite";
  options.language = options.language ?? "en_US";
  options.region = options.region ?? "US";

  const overlayLayerType = options.overlayLayerType;
  //>>includeStart("debug", pragmas.debug);
  if (defined(overlayLayerType)) {
    Check.typeOf.string("options.overlayLayerType", overlayLayerType);
  }
  Check.defined("options.assetId", options.assetId);
  //>>includeEnd("debug");

  const queryOptions = buildQueryOptions(options);

  const endpointResource = IonResource._createEndpointResource(
    options.assetId,
    {
      queryParameters: {
        options: JSON.stringify(queryOptions),
      },
    },
  );

  const endpoint = await endpointResource.fetchJson();
  const endpointOptions = { ...endpoint.options };
  delete endpointOptions.url;

  const providerOptions = {
    language: options.language,
    region: options.region,
    ellipsoid: options.ellipsoid,
    minimumLevel: options.minimumLevel,
    maximumLevel: options.maximumLevel,
    rectangle: options.rectangle,
    credit: options.credit,
  };

  return new Google2DImageryProvider({
    ...endpointOptions,
    ...providerOptions,
    url: new IonResource(endpoint, endpointResource),
  });
};

/**
 * Creates an {@link ImageryProvider} which provides 2D global tiled imagery from {@link https://developers.google.com/maps/documentation/tile/2d-tiles-overview|Google 2D Tiles}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.key=GoogleMaps.defaultApiKey] Your API key to access Google 2D Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {"satellite" | "terrain" | "roadmap"} [options.mapType="satellite"] The map type of the Google map imagery. Valid options are satellite, terrain, and roadmap. If overlayLayerType is set, mapType is ignored and a transparent overlay is returned. If overlayMapType is undefined, then a basemap of mapType is returned. layerRoadmap overlayLayerType is included in terrain and roadmap mapTypes.
 * @param {string} [options.language="en_US"] an IETF language tag that specifies the language used to display information on the tiles
 * @param {string} [options.region="US"] A Common Locale Data Repository region identifier (two uppercase letters) that represents the physical location of the user.
 * @param {"layerRoadmap" | "layerStreetview" | "layerTraffic"} [options.overlayLayerType] Returns a transparent overlay map with the specified layerType. If no value is provided, a basemap of mapType is returned. Use multiple instances of Google2DImageryProvider to add multiple Google Maps overlays to a scene. layerRoadmap is included in terrain and roadmap mapTypes, so adding as overlay to terrain or roadmap has no effect.
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
 * // Use your own Google api key
 * Cesium.GoogleMaps.defaultApiKey = "your-api-key";
 *
 * const googleTilesProvider = Cesium.Google2DImageryProvider.fromUrl({
 *     mapType: "satellite"
 * });
 * @example
 * // Google 2D roadmap overlay with custom styles
 * Cesium.GoogleMaps.defaultApiKey = "your-api-key";
 *
 * const googleTileProvider = Cesium.Google2DImageryProvider.fromUrl({
 *     overlayLayerType: "layerRoadmap",
 *     styles: [
 *         {
 *             stylers: [{ hue: "#00ffe6" }, { saturation: -20 }],
 *         },
 *         {
 *             featureType: "road",
 *             elementType: "geometry",
 *             stylers: [{ lightness: 100 }, { visibility: "simplified" }],
 *         },
 *     ],
 * });
 */
Google2DImageryProvider.fromUrl = async function (options) {
  options = options ?? {};
  options.mapType = options.mapType ?? "satellite";
  options.language = options.language ?? "en_US";
  options.region = options.region ?? "US";
  options.url = options.url ?? GoogleMaps.mapTilesApiEndpoint;
  options.key = options.key ?? GoogleMaps.defaultApiKey;

  const overlayLayerType = options.overlayLayerType;
  //>>includeStart("debug", pragmas.debug);
  if (defined(overlayLayerType)) {
    Check.typeOf.string("overlayLayerType", overlayLayerType);
  }
  if (!defined(options.key) && !defined(GoogleMaps.defaultApiKey)) {
    throw new DeveloperError(
      "options.key or GoogleMaps.defaultApiKey is required.",
    );
  }
  //>>includeEnd("debug");

  const sessionJson = await createGoogleImagerySession(options);
  return new Google2DImageryProvider({
    ...sessionJson,
    ...options,
    credit: options.credit ?? GoogleMaps.getDefaultCredit(),
  });
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]|undefined} The credits to be displayed when the tile is displayed.
 */
Google2DImageryProvider.prototype.getTileCredits = function (x, y, level) {
  const hasAttributions = defined(this._attributionsByLevel);

  if (!hasAttributions || !defined(this._tileCredits)) {
    return undefined;
  }

  const innerCredits = this._attributionsByLevel.get(level);
  if (!defined(this._tileCredits)) {
    return innerCredits;
  }

  return this._tileCredits.concat(innerCredits);
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

/**
 * Get attribution for imagery from Google Maps to display in the credits
 * @private
 * @return {Promise<Map<Credit[]>>} The list of attribution sources to display in the credits.
 */
Google2DImageryProvider.prototype.getViewportCredits = async function () {
  const maximumLevel = this._maximumLevel;

  const promises = [];
  for (let level = 0; level < maximumLevel + 1; level++) {
    promises.push(
      fetchViewportAttribution(
        this._viewportUrl,
        this._key,
        this._session,
        level,
      ),
    );
  }
  const results = await Promise.all(promises);

  const attributionsByLevel = new Map();
  for (let level = 0; level < maximumLevel + 1; level++) {
    const credits = [];
    const attributions = results[level];
    if (attributions) {
      const levelCredits = new Credit(attributions);
      credits.push(levelCredits);
    }
    attributionsByLevel.set(level, credits);
  }

  this._attributionsByLevel = attributionsByLevel;

  return attributionsByLevel;
};

async function fetchViewportAttribution(url, key, session, level) {
  const viewport = await Resource.fetch({
    url: url,
    queryParameters: {
      key,
      session,
      zoom: level,
      north: 90,
      south: -90,
      east: 180,
      west: -180,
    },
    data: JSON.stringify(Frozen.EMPTY_OBJECT),
  });
  const viewportJson = JSON.parse(viewport);
  return viewportJson.copyright;
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
  const { language, region, key, url } = options;

  const queryOptions = buildQueryOptions(options);

  let baseUrl = url.url ?? url;
  if (!trailingSlashRegex.test(baseUrl)) {
    baseUrl += "/";
  }

  const response = await Resource.post({
    url: `${baseUrl}v1/createSession`,
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

export default Google2DImageryProvider;
