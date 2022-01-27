import buildModuleUrl from "../Core/buildModuleUrl.js";
import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import when from "../ThirdParty/when.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 * @typedef {Object} GoogleEarthEnterpriseMapsProvider.ConstructorOptions
 *
 * Initialization options for the GoogleEarthEnterpriseMapsProvider constructor
 *
 * @property {Resource|String} url The url of the Google Earth server hosting the imagery.
 * @property {Number} channel The channel (id) to be used when requesting data from the server.
 *        The channel number can be found by looking at the json file located at:
 *        earth.localdomain/default_map/query?request=Json&vars=geeServerDefs The /default_map path may
 *        differ depending on your Google Earth Enterprise server configuration. Look for the "id" that
 *        is associated with a "ImageryMaps" requestType. There may be more than one id available.
 *        Example:
 *        {
 *          layers: [
 *            {
 *              id: 1002,
 *              requestType: "ImageryMaps"
 *            },
 *            {
 *              id: 1007,
 *              requestType: "VectorMapsRaster"
 *            }
 *          ]
 *        }
 * @property {String} [path="/default_map"] The path of the Google Earth server hosting the imagery.
 * @property {Number} [maximumLevel] The maximum level-of-detail supported by the Google Earth
 *        Enterprise server, or undefined if there is no limit.
 * @property {TileDiscardPolicy} [tileDiscardPolicy] The policy that determines if a tile
 *        is invalid and should be discarded. To ensure that no tiles are discarded, construct and pass
 *        a {@link NeverTileDiscardPolicy} for this parameter.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 */

/**
 * Provides tiled imagery using the Google Earth Imagery API.
 *
 * Notes: This imagery provider does not work with the public Google Earth servers. It works with the
 *        Google Earth Enterprise Server.
 *
 *        By default the Google Earth Enterprise server does not set the
 *        {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing} headers. You can either
 *        use a proxy server which adds these headers, or in the /opt/google/gehttpd/conf/gehttpd.conf
 *        and add the 'Header set Access-Control-Allow-Origin "*"' option to the '&lt;Directory /&gt;' and
 *        '&lt;Directory "/opt/google/gehttpd/htdocs"&gt;' directives.
 *
 *        This provider is for use with 2D Maps API as part of Google Earth Enterprise. For 3D Earth API uses, it
 *        is necessary to use {@link GoogleEarthEnterpriseImageryProvider}
 *
 * @alias GoogleEarthEnterpriseMapsProvider
 * @constructor
 *
 * @param {GoogleEarthEnterpriseMapsProvider.ConstructorOptions} options Object describing initialization options
 *
 * @exception {RuntimeError} Could not find layer with channel (id) of <code>options.channel</code>.
 * @exception {RuntimeError} Could not find a version in channel (id) <code>options.channel</code>.
 * @exception {RuntimeError} Unsupported projection <code>data.projection</code>.
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 *
 *
 * @example
 * var google = new Cesium.GoogleEarthEnterpriseMapsProvider({
 *     url : 'https://earth.localdomain',
 *     channel : 1008
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 */
function GoogleEarthEnterpriseMapsProvider(options) {
  options = defaultValue(options, {});

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  if (!defined(options.channel)) {
    throw new DeveloperError("options.channel is required.");
  }
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
   * @default 1.9
   */
  this.defaultGamma = 1.9;

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

  const url = options.url;
  const path = defaultValue(options.path, "/default_map");

  const resource = Resource.createIfNeeded(url).getDerivedResource({
    // We used to just append path to url, so now that we do proper URI resolution, removed the /
    url: path[0] === "/" ? path.substring(1) : path,
  });

  resource.appendForwardSlash();

  this._resource = resource;
  this._url = url;
  this._path = path;
  this._tileDiscardPolicy = options.tileDiscardPolicy;
  this._channel = options.channel;
  this._requestType = "ImageryMaps";
  this._credit = new Credit(
    '<a href="http://www.google.com/enterprise/mapsearth/products/earthenterprise.html"><img src="' +
      GoogleEarthEnterpriseMapsProvider.logoUrl +
      '" title="Google Imagery"/></a>'
  );

  this._tilingScheme = undefined;

  this._version = undefined;

  this._tileWidth = 256;
  this._tileHeight = 256;
  this._maximumLevel = options.maximumLevel;

  this._errorEvent = new Event();

  this._ready = false;
  this._readyPromise = when.defer();

  const metadataResource = resource.getDerivedResource({
    url: "query",
    queryParameters: {
      request: "Json",
      vars: "geeServerDefs",
      is2d: "t",
    },
  });
  const that = this;
  let metadataError;

  function metadataSuccess(text) {
    let data;

    // The Google Earth server sends malformed JSON data currently...
    try {
      // First, try parsing it like normal in case a future version sends correctly formatted JSON
      data = JSON.parse(text);
    } catch (e) {
      // Quote object strings manually, then try parsing again
      data = JSON.parse(
        text.replace(/([\[\{,])[\n\r ]*([A-Za-z0-9]+)[\n\r ]*:/g, '$1"$2":')
      );
    }

    let layer;
    for (let i = 0; i < data.layers.length; i++) {
      if (data.layers[i].id === that._channel) {
        layer = data.layers[i];
        break;
      }
    }

    let message;

    if (!defined(layer)) {
      message =
        "Could not find layer with channel (id) of " + that._channel + ".";
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestMetadata
      );
      throw new RuntimeError(message);
    }

    if (!defined(layer.version)) {
      message =
        "Could not find a version in channel (id) " + that._channel + ".";
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestMetadata
      );
      throw new RuntimeError(message);
    }
    that._version = layer.version;

    if (defined(data.projection) && data.projection === "flat") {
      that._tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2,
        rectangle: new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI),
        ellipsoid: options.ellipsoid,
      });
      // Default to mercator projection when projection is undefined
    } else if (!defined(data.projection) || data.projection === "mercator") {
      that._tilingScheme = new WebMercatorTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2,
        ellipsoid: options.ellipsoid,
      });
    } else {
      message = "Unsupported projection " + data.projection + ".";
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestMetadata
      );
      throw new RuntimeError(message);
    }

    that._ready = true;
    that._readyPromise.resolve(true);
    TileProviderError.handleSuccess(metadataError);
  }

  function metadataFailure(e) {
    const message =
      "An error occurred while accessing " + metadataResource.url + ".";
    metadataError = TileProviderError.handleError(
      metadataError,
      that,
      that._errorEvent,
      message,
      undefined,
      undefined,
      undefined,
      requestMetadata
    );
    that._readyPromise.reject(new RuntimeError(message));
  }

  function requestMetadata() {
    const metadata = metadataResource.fetchText();
    when(metadata, metadataSuccess, metadataFailure);
  }

  requestMetadata();
}

Object.defineProperties(GoogleEarthEnterpriseMapsProvider.prototype, {
  /**
   * Gets the URL of the Google Earth MapServer.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {String}
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },

  /**
   * Gets the url path of the data on the Google Earth server.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {String}
   * @readonly
   */
  path: {
    get: function () {
      return this._path;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._resource.proxy;
    },
  },

  /**
   * Gets the imagery channel (id) currently being used.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Number}
   * @readonly
   */
  channel: {
    get: function () {
      return this._channel;
    },
  },

  /**
   * Gets the width of each tile, in pixels. This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return this._tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return this._tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return this._maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return 0;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return this._tilingScheme;
    },
  },

  /**
   * Gets the version of the data used by this provider.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Number}
   * @readonly
   */
  version: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "version must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._version;
    },
  },

  /**
   * Gets the type of data that is being requested from the provider.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {String}
   * @readonly
   */
  requestType: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "requestType must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._requestType;
    },
  },
  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "rectangle must not be called before the imagery provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._tilingScheme.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.  This function should
   * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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

      return this._tileDiscardPolicy;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.  This function should not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },
});

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 *
 * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
 */
GoogleEarthEnterpriseMapsProvider.prototype.getTileCredits = function (
  x,
  y,
  level
) {
  return undefined;
};

/**
 * Requests the image for a given tile.  This function should
 * not be called before {@link GoogleEarthEnterpriseMapsProvider#ready} returns true.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request
 *          should be retried later.  The resolved image may be either an
 *          Image or a Canvas DOM object.
 *
 * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
 */
GoogleEarthEnterpriseMapsProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "requestImage must not be called before the imagery provider is ready."
    );
  }
  //>>includeEnd('debug');

  const resource = this._resource.getDerivedResource({
    url: "query",
    request: request,
    queryParameters: {
      request: this._requestType,
      channel: this._channel,
      version: this._version,
      x: x,
      y: y,
      z: level + 1, // Google Earth starts with a zoom level of 1, not 0
    },
  });

  return ImageryProvider.loadImage(this, resource);
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
 * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
 *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
 *                   instances.  The array may be empty if no features are found at the given location.
 *                   It may also be undefined if picking is not supported.
 */
GoogleEarthEnterpriseMapsProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};

GoogleEarthEnterpriseMapsProvider._logoUrl = undefined;

Object.defineProperties(GoogleEarthEnterpriseMapsProvider, {
  /**
   * Gets or sets the URL to the Google Earth logo for display in the credit.
   * @memberof GoogleEarthEnterpriseMapsProvider
   * @type {String}
   */
  logoUrl: {
    get: function () {
      if (!defined(GoogleEarthEnterpriseMapsProvider._logoUrl)) {
        GoogleEarthEnterpriseMapsProvider._logoUrl = buildModuleUrl(
          "Assets/Images/google_earth_credit.png"
        );
      }
      return GoogleEarthEnterpriseMapsProvider._logoUrl;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("value", value);
      //>>includeEnd('debug');

      GoogleEarthEnterpriseMapsProvider._logoUrl = value;
    },
  },
});
export default GoogleEarthEnterpriseMapsProvider;
