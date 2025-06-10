import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import Resource from "../Core/Resource.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import GetFeatureInfoFormat from "./GetFeatureInfoFormat.js";
import TimeDynamicImagery from "./TimeDynamicImagery.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

/**
 * EPSG codes known to include reverse axis orders, but are not within 4000-5000.
 *
 * @type {number[]}
 */
const includesReverseAxis = [
  3034, // ETRS89-extended / LCC Europe
  3035, // ETRS89-extended / LAEA Europe
  3042, // ETRS89 / UTM zone 30N (N-E)
  3043, // ETRS89 / UTM zone 31N (N-E)
  3044, // ETRS89 / UTM zone 32N (N-E)
];

/**
 * EPSG codes known to not include reverse axis orders, and are within 4000-5000.
 *
 * @type {number[]}
 */
const excludesReverseAxis = [
  4471, // Mayotte
  4559, // French Antilles
];

/**
 * @typedef {object} WebMapServiceImageryProvider.ConstructorOptions
 *
 * Initialization options for the WebMapServiceImageryProvider constructor
 *
 * @property {Resource|string} url The URL of the WMS service. The URL supports the same keywords as the {@link UrlTemplateImageryProvider}.
 * @property {string} layers The layers to include, separated by commas.
 * @property {object} [parameters=WebMapServiceImageryProvider.DefaultParameters] Additional parameters to pass to the WMS server in the GetMap URL.
 * @property {object} [getFeatureInfoParameters=WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters] Additional parameters to pass to the WMS server in the GetFeatureInfo URL.
 * @property {boolean} [enablePickFeatures=true] If true, {@link WebMapServiceImageryProvider#pickFeatures} will invoke
 *        the GetFeatureInfo operation on the WMS server and return the features included in the response.  If false,
 *        {@link WebMapServiceImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
 *        without communicating with the server.  Set this property to false if you know your WMS server does not support
 *        GetFeatureInfo or if you don't want this provider's features to be pickable. Note that this can be dynamically
 *        overridden by modifying the WebMapServiceImageryProvider#enablePickFeatures property.
 * @property {GetFeatureInfoFormat[]} [getFeatureInfoFormats=WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats] The formats
 *        in which to try WMS GetFeatureInfo requests.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
 * @property {TilingScheme} [tilingScheme=new GeographicTilingScheme()] The tiling scheme to use to divide the world into tiles.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *        this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *        parameter is specified, the WGS84 ellipsoid is used.
 * @property {number} [tileWidth=256] The width of each tile in pixels.
 * @property {number} [tileHeight=256] The height of each tile in pixels.
 * @property {number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when
 *        specifying this that the number of tiles at the minimum level is small, such as four or less.  A larger number is
 *        likely to result in rendering problems.
 * @property {number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 *        If not specified, there is no limit.
 * @property {string} [crs] CRS specification, for use with WMS specification >= 1.3.0.
 * @property {string} [srs] SRS specification, for use with WMS specification 1.1.0 or 1.1.1
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 * @property {string|string[]} [subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
 *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
 *                          an array, each element in the array is a subdomain.
 * @property {Clock} [clock] A Clock instance that is used when determining the value for the time dimension. Required when `times` is specified.
 * @property {TimeIntervalCollection} [times] TimeIntervalCollection with its data property being an object containing time dynamic dimension and their values.
 * @property {Resource|string} [getFeatureInfoUrl] The getFeatureInfo URL of the WMS service. If the property is not defined then we use the property value of url.
 */

/**
 * Provides tiled imagery hosted by a Web Map Service (WMS) server.
 *
 * @alias WebMapServiceImageryProvider
 * @constructor
 *
 * @param {WebMapServiceImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 *
 * @see {@link http://resources.esri.com/help/9.3/arcgisserver/apis/rest/|ArcGIS Server REST API}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 *
 * @example
 * const provider = new Cesium.WebMapServiceImageryProvider({
 *     url : 'https://sampleserver1.arcgisonline.com/ArcGIS/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer/WMSServer',
 *     layers : '0',
 *     proxy: new Cesium.DefaultProxy('/proxy/')
 * });
 * const imageryLayer = new Cesium.ImageryLayer(provider);
 * viewer.imageryLayers.add(imageryLayer);
 */
function WebMapServiceImageryProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  if (!defined(options.layers)) {
    throw new DeveloperError("options.layers is required.");
  }
  //>>includeEnd('debug');

  if (defined(options.times) && !defined(options.clock)) {
    throw new DeveloperError(
      "options.times was specified, so options.clock is required.",
    );
  }

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

  resource.setQueryParameters(
    WebMapServiceImageryProvider.DefaultParameters,
    true,
  );
  pickFeatureResource.setQueryParameters(
    WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters,
    true,
  );

  if (defined(options.parameters)) {
    resource.setQueryParameters(objectToLowercase(options.parameters));
  }

  if (defined(options.getFeatureInfoParameters)) {
    pickFeatureResource.setQueryParameters(
      objectToLowercase(options.getFeatureInfoParameters),
    );
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

  const parameters = {};
  parameters.layers = options.layers;
  parameters.bbox =
    "{westProjected},{southProjected},{eastProjected},{northProjected}";
  parameters.width = "{width}";
  parameters.height = "{height}";

  // Use SRS or CRS based on the WMS version.
  if (parseFloat(resource.queryParameters.version) >= 1.3) {
    // Use CRS with 1.3.0 and going forward.
    // For GeographicTilingScheme, use CRS:84 vice EPSG:4326 to specify lon, lat (x, y) ordering for
    // bbox requests.
    parameters.crs =
      options.crs ??
      (options.tilingScheme &&
      options.tilingScheme.projection instanceof WebMercatorProjection
        ? "EPSG:3857"
        : "CRS:84");

    // The axis order in previous versions of the WMS specifications was to always use easting (x or lon ) and northing (y or
    // lat). WMS 1.3.0 specifies that, depending on the particular CRS, the x axis may or may not be oriented West-to-East,
    // and the y axis may or may not be oriented South-to-North. The WMS portrayal operation shall account for axis order.
    // This affects some of the EPSG codes that were commonly used such as ESPG:4326. The current implementation
    // makes sure that coordinates passed to the server (as part of the GetMap BBOX parameter) as well as those advertised
    // in the capabilities document reflect the inverse axe orders for EPSG codes between 4000 and 5000.
    //  - Taken from Section 9.1.3 of https://download.osgeo.org/mapserver/docs/MapServer-56.pdf
    const parts = parameters.crs.split(":");
    if (parts[0] === "EPSG" && parts.length === 2) {
      const code = Number(parts[1]);
      if (
        (code >= 4000 && code < 5000 && !excludesReverseAxis.includes(code)) ||
        includesReverseAxis.includes(code)
      ) {
        parameters.bbox =
          "{southProjected},{westProjected},{northProjected},{eastProjected}";
      }
    }
  } else {
    // SRS for WMS 1.1.0 or 1.1.1.
    parameters.srs =
      options.srs ??
      (options.tilingScheme &&
      options.tilingScheme.projection instanceof WebMercatorProjection
        ? "EPSG:3857"
        : "EPSG:4326");
  }

  resource.setQueryParameters(parameters, true);
  pickFeatureResource.setQueryParameters(parameters, true);

  const pickFeatureParams = {
    query_layers: options.layers,
    info_format: "{format}",
  };
  // use correct pixel coordinate identifier based on version
  if (parseFloat(pickFeatureResource.queryParameters.version) >= 1.3) {
    pickFeatureParams.i = "{i}";
    pickFeatureParams.j = "{j}";
  } else {
    pickFeatureParams.x = "{i}";
    pickFeatureParams.y = "{j}";
  }
  pickFeatureResource.setQueryParameters(pickFeatureParams, true);

  this._resource = resource;
  this._pickFeaturesResource = pickFeatureResource;
  this._layers = options.layers;

  // Let UrlTemplateImageryProvider do the actual URL building.
  this._tileProvider = new UrlTemplateImageryProvider({
    url: resource,
    pickFeaturesUrl: pickFeatureResource,
    tilingScheme:
      options.tilingScheme ??
      new GeographicTilingScheme({ ellipsoid: options.ellipsoid }),
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
      WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats,
    enablePickFeatures: options.enablePickFeatures,
  });
}

function requestImage(imageryProvider, col, row, level, request, interval) {
  const dynamicIntervalData = defined(interval) ? interval.data : undefined;
  const tileProvider = imageryProvider._tileProvider;

  if (defined(dynamicIntervalData)) {
    // We set the query parameters within the tile provider, because it is managing the query.
    tileProvider._resource.setQueryParameters(dynamicIntervalData);
  }
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
  const dynamicIntervalData = defined(interval) ? interval.data : undefined;
  const tileProvider = imageryProvider._tileProvider;

  if (defined(dynamicIntervalData)) {
    // We set the query parameters within the tile provider, because it is managing the query.
    tileProvider._pickFeaturesResource.setQueryParameters(dynamicIntervalData);
  }
  return tileProvider.pickFeatures(x, y, level, longitude, latitude);
}

Object.defineProperties(WebMapServiceImageryProvider.prototype, {
  /**
   * Gets the URL of the WMS server.
   * @memberof WebMapServiceImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource._url;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof WebMapServiceImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._resource.proxy;
    },
  },

  /**
   * Gets the names of the WMS layers, separated by commas.
   * @memberof WebMapServiceImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  layers: {
    get: function () {
      return this._layers;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._tileProvider.errorEvent;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return this._tileProvider.hasAlphaChannel;
    },
  },

  /**
   * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link WebMapServiceImageryProvider#pickFeatures} will
   * invoke the <code>GetFeatureInfo</code> service on the WMS server and attempt to interpret the features included in the response.  If false,
   * {@link WebMapServiceImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable
   * features) without communicating with the server.  Set this property to false if you know your data
   * source does not support picking features or if you don't want this provider's features to be pickable.
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * @memberof WebMapServiceImageryProvider.prototype
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
   * Gets the getFeatureInfo URL of the WMS server.
   * @memberof WebMapServiceImageryProvider.prototype
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
WebMapServiceImageryProvider.prototype.getTileCredits = function (x, y, level) {
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
WebMapServiceImageryProvider.prototype.requestImage = function (
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
WebMapServiceImageryProvider.prototype.pickFeatures = function (
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
 * The default parameters to include in the WMS URL to obtain images.  The values are as follows:
 *    service=WMS
 *    version=1.1.1
 *    request=GetMap
 *    styles=
 *    format=image/jpeg
 *
 * @constant
 * @type {object}
 */
WebMapServiceImageryProvider.DefaultParameters = Object.freeze({
  service: "WMS",
  version: "1.1.1",
  request: "GetMap",
  styles: "",
  format: "image/jpeg",
});

/**
 * The default parameters to include in the WMS URL to get feature information.  The values are as follows:
 *     service=WMS
 *     version=1.1.1
 *     request=GetFeatureInfo
 *
 * @constant
 * @type {object}
 */
WebMapServiceImageryProvider.GetFeatureInfoDefaultParameters = Object.freeze({
  service: "WMS",
  version: "1.1.1",
  request: "GetFeatureInfo",
});

WebMapServiceImageryProvider.DefaultGetFeatureInfoFormats = Object.freeze([
  Object.freeze(new GetFeatureInfoFormat("json", "application/json")),
  Object.freeze(new GetFeatureInfoFormat("xml", "text/xml")),
  Object.freeze(new GetFeatureInfoFormat("text", "text/html")),
]);

function objectToLowercase(obj) {
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key.toLowerCase()] = obj[key];
    }
  }
  return result;
}
export default WebMapServiceImageryProvider;
