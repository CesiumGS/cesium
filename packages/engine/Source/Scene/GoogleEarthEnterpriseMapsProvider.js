import buildModuleUrl from "../Core/buildModuleUrl.js";
import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 * @typedef {object} GoogleEarthEnterpriseMapsProvider.ConstructorOptions
 *
 * Initialization options for the GoogleEarthEnterpriseMapsProvider constructor
 *
 * @property {number} channel The channel (id) to be used when requesting data from the server.
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
 * @property {string} [path="/default_map"] The path of the Google Earth server hosting the imagery.
 * @property {number} [maximumLevel] The maximum level-of-detail supported by the Google Earth
 *        Enterprise server, or undefined if there is no limit.
 * @property {TileDiscardPolicy} [tileDiscardPolicy] The policy that determines if a tile
 *        is invalid and should be discarded. To ensure that no tiles are discarded, construct and pass
 *        a {@link NeverTileDiscardPolicy} for this parameter.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 */

/**
 * Used to track creation details while fetching initial metadata
 *
 * @constructor
 * @private
 *
 * @param {GoogleEarthEnterpriseMapsProvider.ConstructorOptions} options An object describing initialization options
 */
function ImageryProviderBuilder(options) {
  this.channel = options.channel;
  this.ellipsoid = options.ellipsoid;
  this.tilingScheme = undefined;
  this.version = undefined;
}

/**
 * Complete GoogleEarthEnterpriseMapsProvider creation based on builder values.
 *
 * @private
 *
 * @param {GoogleEarthEnterpriseMapsProvider} provider
 */
ImageryProviderBuilder.prototype.build = function (provider) {
  provider._channel = this.channel;
  provider._version = this.version;
  provider._tilingScheme = this.tilingScheme;
};

function metadataSuccess(text, imageryProviderBuilder) {
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
    if (data.layers[i].id === imageryProviderBuilder.channel) {
      layer = data.layers[i];
      break;
    }
  }

  if (!defined(layer)) {
    const message = `Could not find layer with channel (id) of ${imageryProviderBuilder.channel}.`;
    throw new RuntimeError(message);
  }

  if (!defined(layer.version)) {
    const message = `Could not find a version in channel (id) ${imageryProviderBuilder.channel}.`;
    throw new RuntimeError(message);
  }

  imageryProviderBuilder.version = layer.version;

  if (defined(data.projection) && data.projection === "flat") {
    imageryProviderBuilder.tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 2,
      rectangle: new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI),
      ellipsoid: imageryProviderBuilder.ellipsoid,
    });
    // Default to mercator projection when projection is undefined
  } else if (!defined(data.projection) || data.projection === "mercator") {
    imageryProviderBuilder.tilingScheme = new WebMercatorTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 2,
      ellipsoid: imageryProviderBuilder.ellipsoid,
    });
  } else {
    const message = `Unsupported projection ${data.projection}.`;
    throw new RuntimeError(message);
  }

  return true;
}

function metadataFailure(error, metadataResource, provider) {
  let message = `An error occurred while accessing ${metadataResource.url}.`;
  if (defined(error) && defined(error.message)) {
    message += `: ${error.message}`;
  }

  TileProviderError.reportError(
    undefined,
    provider,
    defined(provider) ? provider._errorEvent : undefined,
    message
  );

  throw new RuntimeError(message);
}

async function requestMetadata(
  metadataResource,
  imageryProviderBuilder,
  provider
) {
  try {
    const text = await metadataResource.fetchText();
    metadataSuccess(text, imageryProviderBuilder);
  } catch (error) {
    metadataFailure(error, metadataResource, provider);
  }
}

/**
 * <div class="notice">
 * To construct a GoogleEarthEnterpriseMapsProvider, call {@link GoogleEarthEnterpriseImageryProvider.fromUrl}. Do not call the constructor directly.
 * </div>
 *
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
 * const google = await Cesium.GoogleEarthEnterpriseMapsProvider.fromUrl("https://earth.localdomain", 1008);
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 */
function GoogleEarthEnterpriseMapsProvider(options) {
  options = defaultValue(options, {});

  this._defaultAlpha = undefined;
  this._defaultNightAlpha = undefined;
  this._defaultDayAlpha = undefined;
  this._defaultBrightness = undefined;
  this._defaultContrast = undefined;
  this._defaultHue = undefined;
  this._defaultSaturation = undefined;
  this._defaultGamma = 1.9;
  this._defaultMinificationFilter = undefined;
  this._defaultMagnificationFilter = undefined;

  this._tileDiscardPolicy = options.tileDiscardPolicy;
  this._channel = options.channel;
  this._requestType = "ImageryMaps";
  this._credit = new Credit(
    `<a href="http://www.google.com/enterprise/mapsearth/products/earthenterprise.html"><img src="${GoogleEarthEnterpriseMapsProvider.logoUrl}" title="Google Imagery"/></a>`
  );

  this._tilingScheme = undefined;

  this._version = undefined;

  this._tileWidth = 256;
  this._tileHeight = 256;
  this._maximumLevel = options.maximumLevel;

  this._errorEvent = new Event();
}

Object.defineProperties(GoogleEarthEnterpriseMapsProvider.prototype, {
  /**
   * Gets the URL of the Google Earth MapServer.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {string}
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
   * @type {string}
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
   * @type {number}
   * @readonly
   */
  channel: {
    get: function () {
      return this._channel;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the version of the data used by this provider.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {number}
   * @readonly
   */
  version: {
    get: function () {
      return this._version;
    },
  },

  /**
   * Gets the type of data that is being requested from the provider.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {string}
   * @readonly
   */
  requestType: {
    get: function () {
      return this._requestType;
    },
  },
  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
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
   * @memberof GoogleEarthEnterpriseMapsProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
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
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
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
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },
});

/**
 * Creates a tiled imagery provider using the Google Earth Imagery API.
 *
 * @param {Resource|String} url The url of the Google Earth server hosting the imagery.
 * @param {GoogleEarthEnterpriseMapsProvider.ConstructorOptions} [options] Object describing initialization options
 * @returns {Promise<GoogleEarthEnterpriseMapsProvider>} The created GoogleEarthEnterpriseMapsProvider.
 *
 * @exception {RuntimeError} Could not find layer with channel (id) of <code>options.channel</code>.
 * @exception {RuntimeError} Could not find a version in channel (id) <code>options.channel</code>.
 * @exception {RuntimeError} Unsupported projection <code>data.projection</code>.
 *
 * @example
 * const google = await Cesium.GoogleEarthEnterpriseMapsProvider.fromUrl("https://earth.localdomain", 1008);
 */
GoogleEarthEnterpriseMapsProvider.fromUrl = async function (
  url,
  channel,
  options
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  Check.defined("channel", channel);
  //>>includeEnd('debug');

  options = defaultValue(options, {});

  const path = defaultValue(options.path, "/default_map");

  const resource = Resource.createIfNeeded(url).getDerivedResource({
    // We used to just append path to url, so now that we do proper URI resolution, removed the /
    url: path[0] === "/" ? path.substring(1) : path,
  });

  resource.appendForwardSlash();

  const metadataResource = resource.getDerivedResource({
    url: "query",
    queryParameters: {
      request: "Json",
      vars: "geeServerDefs",
      is2d: "t",
    },
  });

  const imageryProviderBuilder = new ImageryProviderBuilder(options);
  imageryProviderBuilder.channel = channel;
  await requestMetadata(metadataResource, imageryProviderBuilder);

  const provider = new GoogleEarthEnterpriseMapsProvider(options);
  imageryProviderBuilder.build(provider);

  provider._resource = resource;
  provider._url = url;
  provider._path = path;

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
GoogleEarthEnterpriseMapsProvider.prototype.getTileCredits = function (
  x,
  y,
  level
) {
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
GoogleEarthEnterpriseMapsProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
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
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {number} longitude The longitude at which to pick features.
 * @param {number} latitude  The latitude at which to pick features.
 * @return {undefined} Undefined since picking is not supported.
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
   * @type {string}
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
