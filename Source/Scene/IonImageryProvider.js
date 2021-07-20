import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import IonResource from "../Core/IonResource.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";
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
var ImageryProviderMapping = {
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

/**
 * @typedef {Object} IonImageryProvider.ConstructorOptions
 *
 * Initialization options for the TileMapServiceImageryProvider constructor
 *
 * @property {Number} assetId An ion imagery asset ID
 * @property {String} [accessToken=Ion.defaultAccessToken] The access token to use.
 * @property {String|Resource} [server=Ion.defaultServer] The resource to the Cesium ion API server.
 */

/**
 * Provides tiled imagery using the Cesium ion REST API.
 *
 * @alias IonImageryProvider
 * @constructor
 *
 * @param {IonImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * viewer.imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({ assetId : 23489024 }));
 */
function IonImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var assetId = options.assetId;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.assetId", assetId);
  //>>includeEnd('debug');

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

  this._ready = false;
  this._tileCredits = undefined;
  this._errorEvent = new Event();

  var that = this;
  var endpointResource = IonResource._createEndpointResource(assetId, options);

  // A simple cache to avoid making repeated requests to ion for endpoints we've
  // already retrieved. This exists mainly to support Bing caching to reduce
  // world imagery sessions, but provides a small boost of performance in general
  // if constantly reloading assets
  var cacheKey =
    options.assetId.toString() + options.accessToken + options.server;
  var promise = IonImageryProvider._endpointCache[cacheKey];
  if (!defined(promise)) {
    promise = endpointResource.fetchJson();
    IonImageryProvider._endpointCache[cacheKey] = promise;
  }

  this._readyPromise = promise.then(function (endpoint) {
    if (endpoint.type !== "IMAGERY") {
      return when.reject(
        new RuntimeError(
          "Cesium ion asset " + assetId + " is not an imagery asset."
        )
      );
    }

    var imageryProvider;
    var externalType = endpoint.externalType;
    if (!defined(externalType)) {
      imageryProvider = new TileMapServiceImageryProvider({
        url: new IonResource(endpoint, endpointResource),
      });
    } else {
      var factory = ImageryProviderMapping[externalType];

      if (!defined(factory)) {
        return when.reject(
          new RuntimeError(
            "Unrecognized Cesium ion imagery type: " + externalType
          )
        );
      }
      imageryProvider = factory(endpoint.options);
    }

    that._tileCredits = IonResource.getCreditsFromEndpoint(
      endpoint,
      endpointResource
    );

    imageryProvider.errorEvent.addEventListener(function (tileProviderError) {
      //Propagate the errorEvent but set the provider to this instance instead
      //of the inner instance.
      tileProviderError.provider = that;
      that._errorEvent.raiseEvent(tileProviderError);
    });

    that._imageryProvider = imageryProvider;
    return imageryProvider.readyPromise.then(function () {
      that._ready = true;
      return true;
    });
  });
}

Object.defineProperties(IonImageryProvider.prototype, {
  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof IonImageryProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof IonImageryProvider.prototype
   * @type {when.Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by the instance.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "tileHeight must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.rectangle;
    },
  },

  /**
   * Gets the width of each tile, in pixels.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "tileWidth must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "tileHeight must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {Number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "maximumLevel must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true. Generally,
   * a minimum level should only be used when the rectangle of the imagery is small
   * enough that the number of tiles at the minimum level is small.  An imagery
   * provider with more than a few tiles at the minimum level will lead to
   * rendering problems.
   * @memberof IonImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "minimumLevel must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.minimumLevel;
    },
  },

  /**
   * Gets the tiling scheme used by the provider.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "tilingScheme must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.tilingScheme;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.  This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "tileDiscardPolicy must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
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
   * the source of the imagery. This function should
   * not be called before {@link IonImageryProvider#ready} returns true.
   * @memberof IonImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "credit must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
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
   * @type {Boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "hasAlphaChannel must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._imageryProvider.hasAlphaChannel;
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
  },
});

/**
 * Gets the credits to be displayed when a given tile is displayed.
 * @function
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 *
 * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
 */
IonImageryProvider.prototype.getTileCredits = function (x, y, level) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "getTileCredits must not be called before the imagery provider is ready."
    );
  }
  //>>includeEnd('debug');

  var innerCredits = this._imageryProvider.getTileCredits(x, y, level);
  if (!defined(innerCredits)) {
    return this._tileCredits;
  }

  return this._tileCredits.concat(innerCredits);
};

/**
 * Requests the image for a given tile.  This function should
 * not be called before {@link IonImageryProvider#ready} returns true.
 * @function
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {when.Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request
 *          should be retried later.  The resolved image may be either an
 *          Image or a Canvas DOM object.
 *
 * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
 */
IonImageryProvider.prototype.requestImage = function (x, y, level, request) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "requestImage must not be called before the imagery provider is ready."
    );
  }
  //>>includeEnd('debug');
  return this._imageryProvider.requestImage(x, y, level, request);
};

/**
 * Asynchronously determines what features, if any, are located at a given longitude and latitude within
 * a tile.  This function should not be called before {@link IonImageryProvider#ready} returns true.
 * This function is optional, so it may not exist on all ImageryProviders.
 *
 * @function
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Number} longitude The longitude at which to pick features.
 * @param {Number} latitude  The latitude at which to pick features.
 * @return {when.Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
 *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
 *                   instances.  The array may be empty if no features are found at the given location.
 *                   It may also be undefined if picking is not supported.
 *
 * @exception {DeveloperError} <code>pickFeatures</code> must not be called before the imagery provider is ready.
 */
IonImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "pickFeatures must not be called before the imagery provider is ready."
    );
  }
  //>>includeEnd('debug');
  return this._imageryProvider.pickFeatures(x, y, level, longitude, latitude);
};

//exposed for testing
IonImageryProvider._endpointCache = {};
export default IonImageryProvider;
