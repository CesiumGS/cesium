import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import Event from "../Core/Event.js";
import IonResource from "../Core/IonResource.js";
import RuntimeError from "../Core/RuntimeError.js";
import ArcGisMapServerImageryProvider from "./ArcGisMapServerImageryProvider.js";
import BingMapsImageryProvider from "./BingMapsImageryProvider.js";
import TileMapServiceImageryProvider from "./TileMapServiceImageryProvider.js";
import GoogleEarthEnterpriseMapsProvider from "./GoogleEarthEnterpriseMapsProvider.js";
import MapboxImageryProvider from "./MapboxImageryProvider.js";
import SingleTileImageryProvider from "./SingleTileImageryProvider.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import WebMapServiceImageryProvider from "./WebMapServiceImageryProvider.js";
import WebMapTileServiceImageryProvider from "./WebMapTileServiceImageryProvider.js";

function createFactory(Type) {
  return function (options) {
    return new Type(options);
  };
}

// These values are the list of supported external imagery
// assets in the Cesium ion beta. They are subject to change.
const ImageryProviderMapping = {
  ARCGIS_MAPSERVER: createFactory(ArcGisMapServerImageryProvider),
  BING: createFactory(BingMapsImageryProvider),
  GOOGLE_EARTH: createFactory(GoogleEarthEnterpriseMapsProvider),
  MAPBOX: createFactory(MapboxImageryProvider),
  SINGLE_TILE: createFactory(SingleTileImageryProvider),
  TMS: createFactory(TileMapServiceImageryProvider),
  URL_TEMPLATE: createFactory(UrlTemplateImageryProvider),
  WMS: createFactory(WebMapServiceImageryProvider),
  WMTS: createFactory(WebMapTileServiceImageryProvider),
};

const ImageryProviderAsyncMapping = {
  ARCGIS_MAPSERVER: ArcGisMapServerImageryProvider.fromUrl,
  BING: async (url, options) => {
    return BingMapsImageryProvider.fromUrl(url, options);
  },
  GOOGLE_EARTH: async (url, options) => {
    const channel = options.channel;
    delete options.channel;
    return GoogleEarthEnterpriseMapsProvider.fromUrl(url, channel, options);
  },
  MAPBOX: (url, options) => {
    return new MapboxImageryProvider({
      url: url,
      ...options,
    });
  },
  SINGLE_TILE: SingleTileImageryProvider.fromUrl,
  TMS: TileMapServiceImageryProvider.fromUrl,
  URL_TEMPLATE: (url, options) => {
    return new UrlTemplateImageryProvider({
      url: url,
      ...options,
    });
  },
  WMS: (url, options) => {
    return new WebMapServiceImageryProvider({
      url: url,
      ...options,
    });
  },
  WMTS: (url, options) => {
    return new WebMapTileServiceImageryProvider({
      url: url,
      ...options,
    });
  },
};

/**
 * @typedef {object} IonImageryProvider.ConstructorOptions
 *
 * Initialization options for the TileMapServiceImageryProvider constructor
 *
 * @property {number} [assetId] An ion imagery asset ID. Deprecated.
 * @property {string} [accessToken=Ion.defaultAccessToken] The access token to use.
 * @property {string|Resource} [server=Ion.defaultServer] The resource to the Cesium ion API server.
 */

/**
 * <div class="notice">
 * To construct a IonImageryProvider, call {@link IonImageryProvider.fromAssetId}. Do not call the constructor directly.
 * </div>
 *
 * Provides tiled imagery using the Cesium ion REST API.
 *
 * @alias IonImageryProvider
 * @constructor
 *
 * @param {IonImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * const imageryLayer = Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(3812));
 * viewer.imageryLayers.add(imageryLayer);
 *
 * @see IonImageryProvider.fromAssetId
 */
function IonImageryProvider(options) {
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

  this._ready = false;
  this._tileCredits = undefined;
  this._errorEvent = new Event();

  const assetId = options.assetId;
  if (defined(assetId)) {
    deprecationWarning(
      "IonImageryProvider options.assetId",
      "options.assetId was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use IonImageryProvider.fromAssetId instead."
    );

    IonImageryProvider._initialize(this, assetId, options);
  }
}

Object.defineProperties(IonImageryProvider.prototype, {
  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof IonImageryProvider.prototype
   * @type {boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.ready",
        "IonImageryProvider.ready was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use IonImageryProvider.fromAssetId instead."
      );
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof IonImageryProvider.prototype
   * @type {Promise<boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.readyPromise",
        "IonImageryProvider.readyPromise was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use IonImageryProvider.fromAssetId instead."
      );
      return this._readyPromise;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by the instance.
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
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
   * @memberof IonImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._imageryProvider.credit;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof IonImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return this._imageryProvider.hasAlphaChannel;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof IonImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   * @default undefined
   */
  proxy: {
    get: function () {
      return undefined;
    },
  },

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultAlpha: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultAlpha",
        "IonImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      return this._defaultAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultAlpha",
        "IonImageryProvider.defaultAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.alpha instead."
      );
      this._defaultAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultNightAlpha: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultNightAlpha",
        "IonImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      return this.defaultNightAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultNightAlpha",
        "IonImageryProvider.defaultNightAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.nightAlpha instead."
      );
      this.defaultNightAlpha = value;
    },
  },

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultDayAlpha: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultDayAlpha",
        "IonImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      return this._defaultDayAlpha;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultDayAlpha",
        "IonImageryProvider.defaultDayAlpha was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.dayAlpha instead."
      );
      this._defaultDayAlpha = value;
    },
  },

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultBrightness: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultBrightness",
        "IonImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      return this._defaultBrightness;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultBrightness",
        "IonImageryProvider.defaultBrightness was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.brightness instead."
      );
      this._defaultBrightness = value;
    },
  },

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultContrast: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultContrast",
        "IonImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      return this._defaultContrast;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultContrast",
        "IonImageryProvider.defaultContrast was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.contrast instead."
      );
      this._defaultContrast = value;
    },
  },

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultHue: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultHue",
        "IonImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      return this._defaultHue;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultHue",
        "IonImageryProvider.defaultHue was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.hue instead."
      );
      this._defaultHue = value;
    },
  },

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultSaturation: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultSaturation",
        "IonImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      return this._defaultSaturation;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultSaturation",
        "IonImageryProvider.defaultSaturation was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.saturation instead."
      );
      this._defaultSaturation = value;
    },
  },

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultGamma: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultGamma",
        "IonImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      return this._defaultGamma;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultGamma",
        "IonImageryProvider.defaultGamma was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.gamma instead."
      );
      this._defaultGamma = value;
    },
  },

  /**
   * The default texture minification filter to apply to this provider.
   * @memberof IonImageryProvider.prototype
   * @type {TextureMinificationFilter}
   * @deprecated
   */
  defaultMinificationFilter: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultMinificationFilter",
        "IonImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      return this._defaultMinificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultMinificationFilter",
        "IonImageryProvider.defaultMinificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.minificationFilter instead."
      );
      this._defaultMinificationFilter = value;
    },
  },

  /**
   * The default texture magnification filter to apply to this provider.
   * @memberof IonImageryProvider.prototype
   * @type {TextureMagnificationFilter}
   * @deprecated
   */
  defaultMagnificationFilter: {
    get: function () {
      deprecationWarning(
        "IonImageryProvider.defaultMagnificationFilter",
        "IonImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      return this._defaultMagnificationFilter;
    },
    set: function (value) {
      deprecationWarning(
        "IonImageryProvider.defaultMagnificationFilter",
        "IonImageryProvider.defaultMagnificationFilter was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ImageryLayer.magnificationFilter instead."
      );
      this._defaultMagnificationFilter = value;
    },
  },
});

// This is here for backwards compatibility
IonImageryProvider._initialize = function (provider, assetId, options) {
  const endpointResource = IonResource._createEndpointResource(
    assetId,
    options
  );

  // A simple cache to avoid making repeated requests to ion for endpoints we've
  // already retrieved. This exists mainly to support Bing caching to reduce
  // world imagery sessions, but provides a small boost of performance in general
  // if constantly reloading assets
  const cacheKey = assetId.toString() + options.accessToken + options.server;
  let promise = IonImageryProvider._endpointCache[cacheKey];
  if (!defined(promise)) {
    promise = endpointResource.fetchJson();
    IonImageryProvider._endpointCache[cacheKey] = promise;
  }

  provider._readyPromise = promise.then(function (endpoint) {
    if (endpoint.type !== "IMAGERY") {
      return Promise.reject(
        new RuntimeError(`Cesium ion asset ${assetId} is not an imagery asset.`)
      );
    }

    let imageryProvider;
    const externalType = endpoint.externalType;
    if (!defined(externalType)) {
      imageryProvider = new TileMapServiceImageryProvider({
        url: new IonResource(endpoint, endpointResource),
      });
    } else {
      const factory = ImageryProviderMapping[externalType];

      if (!defined(factory)) {
        return Promise.reject(
          new RuntimeError(
            `Unrecognized Cesium ion imagery type: ${externalType}`
          )
        );
      }
      imageryProvider = factory(endpoint.options);
    }

    provider._tileCredits = IonResource.getCreditsFromEndpoint(
      endpoint,
      endpointResource
    );

    imageryProvider.errorEvent.addEventListener(function (tileProviderError) {
      //Propagate the errorEvent but set the provider to this instance instead
      //of the inner instance.
      tileProviderError.provider = provider;
      provider._errorEvent.raiseEvent(tileProviderError);
    });

    provider._imageryProvider = imageryProvider;
    // readyPromise is deprecated. This is here for backwards compatibility
    return Promise.resolve(imageryProvider._readyPromise).then(function () {
      provider._ready = true;
      return true;
    });
  });
};

/**
 * Creates a provider for tiled imagery using the Cesium ion REST API.
 *
 * @param {Number} assetId  An ion imagery asset ID.
 * @param {IonImageryProvider.ConstructorOptions} options Object describing initialization options.
 * @returns {Promise<IonImageryProvider>} A promise which resolves to the created IonImageryProvider.
 *
 * @example
 * const imageryLayer = Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(3812));
 * viewer.imageryLayers.add(imageryLayer);
 *
 * @exception {RuntimeError} Cesium ion assetId is not an imagery asset
 * @exception {RuntimeError} Unrecognized Cesium ion imagery type
 */
IonImageryProvider.fromAssetId = async function (assetId, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("assetId", assetId);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const endpointResource = IonResource._createEndpointResource(
    assetId,
    options
  );

  // A simple cache to avoid making repeated requests to ion for endpoints we've
  // already retrieved. This exists mainly to support Bing caching to reduce
  // world imagery sessions, but provides a small boost of performance in general
  // if constantly reloading assets
  const cacheKey = assetId.toString() + options.accessToken + options.server;
  let promise = IonImageryProvider._endpointCache[cacheKey];
  if (!defined(promise)) {
    promise = endpointResource.fetchJson();
    IonImageryProvider._endpointCache[cacheKey] = promise;
  }

  const endpoint = await promise;
  if (endpoint.type !== "IMAGERY") {
    throw new RuntimeError(
      `Cesium ion asset ${assetId} is not an imagery asset.`
    );
  }

  let imageryProvider;
  const externalType = endpoint.externalType;
  if (!defined(externalType)) {
    imageryProvider = await TileMapServiceImageryProvider.fromUrl(
      new IonResource(endpoint, endpointResource)
    );
  } else {
    const factory = ImageryProviderAsyncMapping[externalType];

    if (!defined(factory)) {
      throw new RuntimeError(
        `Unrecognized Cesium ion imagery type: ${externalType}`
      );
    }
    // Make a copy before editing since this object reference is cached;
    const options = { ...endpoint.options };
    const url = options.url;
    delete options.url;
    imageryProvider = await factory(url, options);
  }

  const provider = new IonImageryProvider(options);

  imageryProvider.errorEvent.addEventListener(function (tileProviderError) {
    //Propagate the errorEvent but set the provider to this instance instead
    //of the inner instance.
    tileProviderError.provider = provider;
    provider._errorEvent.raiseEvent(tileProviderError);
  });

  provider._tileCredits = IonResource.getCreditsFromEndpoint(
    endpoint,
    endpointResource
  );

  provider._imageryProvider = imageryProvider;
  provider._ready = true;
  provider._readyPromise = Promise.resolve(true);

  return provider;
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 * @function
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
IonImageryProvider.prototype.getTileCredits = function (x, y, level) {
  const innerCredits = this._imageryProvider.getTileCredits(x, y, level);
  if (!defined(innerCredits)) {
    return this._tileCredits;
  }

  return this._tileCredits.concat(innerCredits);
};

/**
 * Requests the image for a given tile.
 * @function
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<ImageryTypes>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
IonImageryProvider.prototype.requestImage = function (x, y, level, request) {
  return this._imageryProvider.requestImage(x, y, level, request);
};

/**
 * Asynchronously determines what features, if any, are located at a given longitude and latitude within
 * a tile. This function is optional, so it may not exist on all ImageryProviders.
 *
 * @function
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
IonImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return this._imageryProvider.pickFeatures(x, y, level, longitude, latitude);
};

//exposed for testing
IonImageryProvider._endpointCache = {};
export default IonImageryProvider;
