import combine from "../Core/combine.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import TimeDynamicImagery from "./TimeDynamicImagery.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import GetFeatureInfoFormat from "./GetFeatureInfoFormat.js";

const defaultParameters = Object.freeze({
  service: "WMTS",
  version: "1.0.0",
  request: "GetTile",
});

/**
 * @typedef {object} WebMapTileServiceImageryProvider.ConstructorOptions
 *
 * Initialization options for the WebMapTileServiceImageryProvider constructor
 *
 * @property {Resource|string} url The base URL for the WMTS GetTile operation (for KVP-encoded requests) or the tile-URL template (for RESTful requests). The tile-URL template should contain the following variables: &#123;style&#125;, &#123;TileMatrixSet&#125;, &#123;TileMatrix&#125;, &#123;TileRow&#125;, &#123;TileCol&#125;. The first two are optional if actual values are hardcoded or not required by the server. The &#123;s&#125; keyword may be used to specify subdomains.
 * @property {string} [format='image/jpeg'] The MIME type for images to retrieve from the server.
 * @property {string} layer The layer name for WMTS requests.
 * @property {string} style The style name for WMTS requests.
 * @property {string} tileMatrixSetID The identifier of the TileMatrixSet to use for WMTS requests.
 * @property {Array} [tileMatrixLabels] A list of identifiers in the TileMatrix to use for WMTS requests, one per TileMatrix level.
 * @property {Clock} [clock] A Clock instance that is used when determining the value for the time dimension. Required when `times` is specified.
 * @property {TimeIntervalCollection} [times] TimeIntervalCollection with its <code>data</code> property being an object containing time dynamic dimension and their values.
 * @property {object} [dimensions] A object containing static dimensions and their values.
 * @property {number} [tileWidth=256] The tile width in pixels.
 * @property {number} [tileHeight=256] The tile height in pixels.
 * @property {TilingScheme} [tilingScheme] The tiling scheme corresponding to the organization of the tiles in the TileMatrixSet.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle covered by the layer.
 * @property {number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
 * @property {number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 * @property {string|string[]} [subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
 *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
 *                          an array, each element in the array is a subdomain.
 * @property {boolean} [enablePickFeatures=true] If true, {@link WebMapTileServiceImageryProvider#pickFeatures} will invoke
 *                          the GetFeatureInfo operation on the WMTS server and return the features included in the response.  If false,
 *                          {@link WebMapTileServiceImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
 *                          without communicating with the server.  Set this property to false if you know your WMTS server does not support
 *                          GetFeatureInfo or if you don't want this provider's features to be pickable.
 * @property {GetFeatureInfoFormat[]} [getFeatureInfoFormats=WebMapTileServiceImageryProvider.DefaultGetFeatureInfoFormats] The formats
 *                          in which to try WMTS GetFeatureInfo requests.
 * @property {Resource|string} [getFeatureInfoUrl] The GetFeatureInfo URL of the WMTS service. If not specified, the value of <code>url</code> is used.
 * @property {object} [getFeatureInfoParameters] Additional parameters to include in GetFeatureInfo requests. Keys are lowercased internally.
 */

/**
 * Provides tiled imagery served by {@link http://www.opengeospatial.org/standards/wmts|WMTS 1.0.0} compliant servers.
 * This provider supports HTTP KVP-encoded and RESTful GetTile requests, but does not yet support the SOAP encoding.
 *
 * @alias WebMapTileServiceImageryProvider
 * @constructor
 *
 * @param {WebMapTileServiceImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=web-map-tile-service-with-time|Cesium Sandcastle Web Map Tile Service with Time Demo}
 *
 * @example
 * // Example 1. USGS shaded relief tiles (KVP)
 * const shadedRelief1 = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS',
 *     layer : 'USGSShadedReliefOnly',
 *     style : 'default',
 *     format : 'image/jpeg',
 *     tileMatrixSetID : 'default028mm',
 *     // tileMatrixLabels : ['default028mm:0', 'default028mm:1', 'default028mm:2' ...],
 *     maximumLevel: 19,
 *     credit : new Cesium.Credit('U. S. Geological Survey')
 * });
 * viewer.imageryLayers.addImageryProvider(shadedRelief1);
 *
 * @example
 * // Example 2. USGS shaded relief tiles (RESTful)
 * const shadedRelief2 = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS/tile/1.0.0/USGSShadedReliefOnly/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
 *     layer : 'USGSShadedReliefOnly',
 *     style : 'default',
 *     format : 'image/jpeg',
 *     tileMatrixSetID : 'default028mm',
 *     maximumLevel: 19,
 *     credit : new Cesium.Credit('U. S. Geological Survey')
 * });
 * viewer.imageryLayers.addImageryProvider(shadedRelief2);
 *
 * @example
 * // Example 3. NASA time dynamic weather data (RESTful)
 * const times = Cesium.TimeIntervalCollection.fromIso8601({
 *     iso8601: '2015-07-30/2017-06-16/P1D',
 *     dataCallback: function dataCallback(interval, index) {
 *         return {
 *             Time: Cesium.JulianDate.toIso8601(interval.start)
 *         };
 *     }
 * });
 * const weather = new Cesium.WebMapTileServiceImageryProvider({
 *     url : 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/AMSR2_Snow_Water_Equivalent/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
 *     layer : 'AMSR2_Snow_Water_Equivalent',
 *     style : 'default',
 *     tileMatrixSetID : '2km',
 *     maximumLevel : 5,
 *     format : 'image/png',
 *     clock: clock,
 *     times: times,
 *     credit : new Cesium.Credit('NASA Global Imagery Browse Services for EOSDIS')
 * });
 * viewer.imageryLayers.addImageryProvider(weather);
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see UrlTemplateImageryProvider
 */
function WebMapTileServiceImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  if (!defined(options.layer)) {
    throw new DeveloperError("options.layer is required.");
  }
  if (!defined(options.style)) {
    throw new DeveloperError("options.style is required.");
  }
  if (!defined(options.tileMatrixSetID)) {
    throw new DeveloperError("options.tileMatrixSetID is required.");
  }
  if (defined(options.times) && !defined(options.clock)) {
    throw new DeveloperError(
      "options.times was specified, so options.clock is required.",
    );
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

  this._getFeatureInfoUrl = options.getFeatureInfoUrl ?? options.url;

  const resource = Resource.createIfNeeded(options.url);
  const pickFeatureResource = Resource.createIfNeeded(this._getFeatureInfoUrl);

  const style = options.style;
  const tileMatrixSetID = options.tileMatrixSetID;
  const url = resource.url;
  const format = options.format ?? "image/jpeg";

  const bracketMatch = url.match(/{/g);
  if (
    !defined(bracketMatch) ||
    (bracketMatch.length === 1 && /{s}/.test(url))
  ) {
    resource.setQueryParameters(defaultParameters, true);
    this._useKvp = true;
  } else {
    this._useKvp = false;
  }

  if (this._useKvp) {
    pickFeatureResource.setQueryParameters(
      WebMapTileServiceImageryProvider.GetFeatureInfoDefaultParameters,
      true,
    );

    if (defined(options.getFeatureInfoParameters)) {
      pickFeatureResource.setQueryParameters(
        objectToLowercase(options.getFeatureInfoParameters),
      );
    }

    const pickFeatureParams = {
      infoformat: "{format}",
      i: "{i}",
      j: "{j}",
    };
    pickFeatureResource.setQueryParameters(pickFeatureParams, true);
  } else {
    pickFeatureResource.setTemplateValues(
      WebMapTileServiceImageryProvider.GetFeatureInfoDefaultParameters,
      true,
    );

    if (defined(options.getFeatureInfoParameters)) {
      pickFeatureResource.setTemplateValues(
        objectToLowercase(options.getFeatureInfoParameters),
      );
    }
  }

  this._resource = resource;
  this._tileMatrixLabels = options.tileMatrixLabels;
  this._format = format;
  this._dimensions = options.dimensions;
  this._tilematrixset = tileMatrixSetID;

  const parameters = {};
  parameters.tilematrix = "{TileMatrix}";
  parameters.layer = options.layer;
  parameters.style = style;
  parameters.tilerow = "{TileRow}";
  parameters.tilecol = "{TileCol}";
  parameters.tilematrixset = tileMatrixSetID;

  if (this._useKvp) {
    resource.setQueryParameters(parameters, true);
    resource.setQueryParameters({ format: format }, true);
    pickFeatureResource.setQueryParameters({ format: format }, true);
    pickFeatureResource.setQueryParameters(parameters, true);
  } else {
    resource.setTemplateValues(parameters);
    resource.setTemplateValues({ format: format });
    pickFeatureResource.setTemplateValues(parameters);
  }

  const that = this;
  this._reload = undefined;
  if (defined(options.times)) {
    this._timeDynamicImagery = new TimeDynamicImagery({
      clock: options.clock,
      times: options.times,
      requestImageFunction: function (x, y, level, request, interval) {
        return requestImage(that, x, y, level, request, interval);
      },
      reloadFunction: function () {
        if (defined(that._reload)) {
          that._reload();
        }
      },
    });
  }

  this._errorEvent = new Event();

  // Let UrlTemplateImageryProvider do the actual URL building.
  this._tileProvider = new UrlTemplateImageryProvider({
    url: resource,
    pickFeaturesUrl: pickFeatureResource,
    tilingScheme:
      options.tilingScheme ??
      new WebMercatorTilingScheme({ ellipsoid: options.ellipsoid }),
    rectangle: options.rectangle,
    tileWidth: options.tileWidth,
    tileHeight: options.tileHeight,
    minimumLevel: options.minimumLevel,
    maximumLevel: options.maximumLevel,
    subdomains: options.subdomains,
    tileDiscardPolicy: options.tileDiscardPolicy,
    credit: options.credit,
    getFeatureInfoFormats:
      options.getFeatureInfoFormats ??
      WebMapTileServiceImageryProvider.DefaultGetFeatureInfoFormats,
    enablePickFeatures: options.enablePickFeatures,
    customTags: createCustomTags(this),
  });
}

function requestImage(imageryProvider, col, row, level, request, interval) {
  const tileProvider = imageryProvider._tileProvider;

  applyDimensions(imageryProvider, tileProvider._resource, interval);

  return tileProvider.requestImage(col, row, level, request);
}

function pickFeatures(
  imageryProvider,
  x,
  y,
  level,
  longitude,
  latitude,
  interval,
) {
  const tileProvider = imageryProvider._tileProvider;

  applyDimensions(
    imageryProvider,
    tileProvider._pickFeaturesResource,
    interval,
  );

  return tileProvider.pickFeatures(x, y, level, longitude, latitude);
}

Object.defineProperties(WebMapTileServiceImageryProvider.prototype, {
  /**
   * Gets the URL of the service hosting the imagery.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource.url;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._resource.proxy;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._tileProvider.tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._tileProvider.tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._tileProvider.maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return this._tileProvider.minimumLevel;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tileProvider.tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._tileProvider.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return this._tileProvider.tileDiscardPolicy;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._tileProvider.errorEvent;
    },
  },

  /**
   * Gets the mime type of images returned by this imagery provider.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  format: {
    get: function () {
      return this._format;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._tileProvider.credit;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },

  /**
   * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link WebMapTileServiceImageryProvider#pickFeatures} will
   * invoke the <code>GetFeatureInfo</code> service on the WMS server and attempt to interpret the features included in the response.  If false,
   * {@link WebMapTileServiceImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable
   * features) without communicating with the server.  Set this property to false if you know your data
   * source does not support picking features or if you don't want this provider's features to be pickable.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {boolean}
   * @default true
   */
  enablePickFeatures: {
    get: function () {
      return this._tileProvider.enablePickFeatures;
    },
    set: function (enablePickFeatures) {
      this._tileProvider.enablePickFeatures = enablePickFeatures;
    },
  },

  /**
   * Gets or sets a clock that is used to get keep the time used for time dynamic parameters.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Clock}
   */
  clock: {
    get: function () {
      return this._timeDynamicImagery.clock;
    },
    set: function (value) {
      this._timeDynamicImagery.clock = value;
    },
  },
  /**
   * Gets or sets a time interval collection that is used to get time dynamic parameters. The data of each
   * TimeInterval is an object containing the keys and values of the properties that are used during
   * tile requests.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {TimeIntervalCollection}
   */
  times: {
    get: function () {
      return this._timeDynamicImagery.times;
    },
    set: function (value) {
      this._timeDynamicImagery.times = value;
    },
  },
  /**
   * Gets or sets an object that contains static dimensions and their values.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {object}
   */
  dimensions: {
    get: function () {
      return this._dimensions;
    },
    set: function (value) {
      if (this._dimensions !== value) {
        this._dimensions = value;
        if (defined(this._reload)) {
          this._reload();
        }
      }
    },
  },

  /**
   * Gets the getFeatureInfo URL of the WMS server.
   * @memberof WebMapTileServiceImageryProvider.prototype
   * @type {Resource|string}
   * @readonly
   */
  getFeatureInfoUrl: {
    get: function () {
      return this._getFeatureInfoUrl;
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
WebMapTileServiceImageryProvider.prototype.getTileCredits = function (
  x,
  y,
  level,
) {
  return this._tileProvider.getTileCredits(x, y, level);
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
WebMapTileServiceImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request,
) {
  let result;
  const timeDynamicImagery = this._timeDynamicImagery;
  let currentInterval;

  // Try and load from cache
  if (defined(timeDynamicImagery)) {
    currentInterval = timeDynamicImagery.currentInterval;
    result = timeDynamicImagery.getFromCache(x, y, level, request);
  }

  // Couldn't load from cache
  if (!defined(result)) {
    result = requestImage(this, x, y, level, request, currentInterval);
  }

  // If we are approaching an interval, preload this tile in the next interval
  if (defined(result) && defined(timeDynamicImagery)) {
    timeDynamicImagery.checkApproachingInterval(x, y, level, request);
  }

  return result;
};

/**
 * Asynchronously determines what features, if any, are located at a given longitude and latitude within
 * a tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {number} longitude The longitude at which to pick features.
 * @param {number} latitude  The latitude at which to pick features.
 * @return {Promise<ImageryLayerFeatureInfo[]>|undefined} A promise for the picked features that will resolve when the asynchronous
 *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
 *                   instances.  The array may be empty if no features are found at the given location.
 */
WebMapTileServiceImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  const timeDynamicImagery = this._timeDynamicImagery;
  const currentInterval = defined(timeDynamicImagery)
    ? timeDynamicImagery.currentInterval
    : undefined;

  return pickFeatures(this, x, y, level, longitude, latitude, currentInterval);
};

/**
 * The default parameters to include in the WMTS URL to get feature information.  The values are as follows:
 *     service=WMTS
 *     version=1.0.0
 *     request=GetFeatureInfo
 *
 * @constant
 * @type {object}
 */
WebMapTileServiceImageryProvider.GetFeatureInfoDefaultParameters =
  Object.freeze({
    service: "WMTS",
    version: "1.0.0",
    request: "GetFeatureInfo",
  });

WebMapTileServiceImageryProvider.DefaultGetFeatureInfoFormats = Object.freeze([
  Object.freeze(new GetFeatureInfoFormat("json", "application/json")),
  Object.freeze(new GetFeatureInfoFormat("xml", "text/xml")),
  Object.freeze(new GetFeatureInfoFormat("text", "text/html")),
]);

function applyDimensions(imageryProvider, resource, interval) {
  const staticDimensions = imageryProvider._dimensions;
  const dynamicIntervalData = defined(interval) ? interval.data : undefined;

  if (!imageryProvider._useKvp) {
    if (defined(staticDimensions)) {
      resource.setTemplateValues(staticDimensions);
    }

    if (defined(dynamicIntervalData)) {
      resource.setTemplateValues(dynamicIntervalData);
    }
  } else {
    // build KVP request
    let query = {};

    if (defined(staticDimensions)) {
      query = combine(query, staticDimensions);
    }

    if (defined(dynamicIntervalData)) {
      query = combine(query, dynamicIntervalData);
    }

    resource.setQueryParameters(query);
  }
}

function createCustomTags(imageryProvider) {
  function getTileMatrix(level) {
    const labels = imageryProvider._tileMatrixLabels;
    return defined(labels) ? labels[level] : level.toString();
  }

  return {
    TileMatrix: function (provider, x, y, level) {
      return getTileMatrix(level);
    },
    tilematrix: function (provider, x, y, level) {
      return getTileMatrix(level);
    },
    TileRow: function (provider, x, y) {
      return y.toString();
    },
    tilerow: function (provider, x, y) {
      return y.toString();
    },
    TileCol: function (provider, x, y) {
      return x.toString();
    },
    tilecol: function (provider, x, y) {
      return x.toString();
    },
    TileMatrixSet: function (provider) {
      return imageryProvider._tilematrixset;
    },
    tilematrixset: function (provider) {
      return imageryProvider._tilematrixset;
    },
  };
}

function objectToLowercase(obj) {
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key.toLowerCase()] = obj[key];
    }
  }
  return result;
}

export default WebMapTileServiceImageryProvider;
