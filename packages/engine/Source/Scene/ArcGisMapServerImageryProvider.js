import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import GeographicProjection from "../Core/GeographicProjection.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import ArcGisMapService from "./ArcGisMapService.js";
import DiscardMissingTileImagePolicy from "./DiscardMissingTileImagePolicy.js";
import ImageryLayerFeatureInfo from "./ImageryLayerFeatureInfo.js";
import ImageryProvider from "./ImageryProvider.js";
import ArcGisBaseMapType from "./ArcGisBaseMapType.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * @typedef {object} ArcGisMapServerImageryProvider.ConstructorOptions
 *
 * Initialization options for the ArcGisMapServerImageryProvider constructor
 *
 * @property {TileDiscardPolicy} [tileDiscardPolicy] The policy that determines if a tile
 *        is invalid and should be discarded.  If this value is not specified, a default
 *        {@link DiscardMissingTileImagePolicy} is used for tiled map servers, and a
 *        {@link NeverTileDiscardPolicy} is used for non-tiled map servers.  In the former case,
 *        we request tile 0,0 at the maximum tile level and check pixels (0,0), (200,20), (20,200),
 *        (80,110), and (160, 130).  If all of these pixels are transparent, the discard check is
 *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
 *        tile that has the same values in these pixel locations is discarded.  The end result of
 *        these defaults should be correct tile discarding for a standard ArcGIS Server.  To ensure
 *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
 *        parameter.
 * @property {boolean} [usePreCachedTilesIfAvailable=true] If true, the server's pre-cached
 *        tiles are used if they are available. Exporting Tiles is only supported with deprecated APIs.
 * @property {string} [layers] A comma-separated list of the layers to show, or undefined if all layers should be shown.
 * @property {boolean} [enablePickFeatures=true] If true, {@link ArcGisMapServerImageryProvider#pickFeatures} will invoke
 *        the Identify service on the MapServer and return the features included in the response.  If false,
 *        {@link ArcGisMapServerImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
 *        without communicating with the server.  Set this property to false if you don't want this provider's features to
 *        be pickable. Can be overridden by setting the {@link ArcGisMapServerImageryProvider#enablePickFeatures} property on the object.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.  This parameter is ignored when accessing
 *                    a tiled layer.
 * @property {TilingScheme} [tilingScheme=new GeographicTilingScheme()] The tiling scheme to use to divide the world into tiles.
 *                       This parameter is ignored when accessing a tiled server.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.  If the tilingScheme is specified and used,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the default ellipsoid is used.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.  This parameter is ignored when accessing a tiled server.
 * @property {number} [tileWidth=256] The width of each tile in pixels.  This parameter is ignored when accessing a tiled server.
 * @property {number} [tileHeight=256] The height of each tile in pixels.  This parameter is ignored when accessing a tiled server.
 * @property {number} [maximumLevel] The maximum tile level to request, or undefined if there is no maximum.  This parameter is ignored when accessing
 *                                        a tiled server.
 *
 *
 */

/**
 * Used to track creation details while fetching initial metadata
 *
 * @constructor
 * @private
 *
 * @param {ArcGisMapServerImageryProvider.ConstructorOptions} options An object describing initialization options
 */
function ImageryProviderBuilder(options) {
  this.useTiles = defaultValue(options.usePreCachedTilesIfAvailable, true);

  const ellipsoid = options.ellipsoid;
  this.tilingScheme = defaultValue(
    options.tilingScheme,
    new GeographicTilingScheme({ ellipsoid: ellipsoid }),
  );
  this.rectangle = defaultValue(options.rectangle, this.tilingScheme.rectangle);
  this.ellipsoid = ellipsoid;

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this.credit = credit;
  this.tileCredits = undefined;
  this.tileDiscardPolicy = options.tileDiscardPolicy;

  this.tileWidth = defaultValue(options.tileWidth, 256);
  this.tileHeight = defaultValue(options.tileHeight, 256);
  this.maximumLevel = options.maximumLevel;
}

/**
 * Complete ArcGisMapServerImageryProvider creation based on builder values.
 *
 * @private
 *
 * @param {ArcGisMapServerImageryProvider} provider
 */
ImageryProviderBuilder.prototype.build = function (provider) {
  provider._useTiles = this.useTiles;
  provider._tilingScheme = this.tilingScheme;
  provider._rectangle = this.rectangle;
  provider._credit = this.credit;
  provider._tileCredits = this.tileCredits;
  provider._tileDiscardPolicy = this.tileDiscardPolicy;
  provider._tileWidth = this.tileWidth;
  provider._tileHeight = this.tileHeight;
  provider._maximumLevel = this.maximumLevel;

  // Install the default tile discard policy if none has been supplied.
  if (this.useTiles && !defined(this.tileDiscardPolicy)) {
    provider._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
      missingImageUrl: buildImageResource(provider, 0, 0, this.maximumLevel)
        .url,
      pixelsToCheck: [
        new Cartesian2(0, 0),
        new Cartesian2(200, 20),
        new Cartesian2(20, 200),
        new Cartesian2(80, 110),
        new Cartesian2(160, 130),
      ],
      disableCheckIfAllPixelsAreTransparent: true,
    });
  }
};

function metadataSuccess(data, imageryProviderBuilder) {
  const tileInfo = data.tileInfo;
  if (!defined(tileInfo)) {
    imageryProviderBuilder.useTiles = false;
  } else {
    imageryProviderBuilder.tileWidth = tileInfo.rows;
    imageryProviderBuilder.tileHeight = tileInfo.cols;

    if (
      tileInfo.spatialReference.wkid === 102100 ||
      tileInfo.spatialReference.wkid === 102113
    ) {
      imageryProviderBuilder.tilingScheme = new WebMercatorTilingScheme({
        ellipsoid: imageryProviderBuilder.ellipsoid,
      });
    } else if (data.tileInfo.spatialReference.wkid === 4326) {
      imageryProviderBuilder.tilingScheme = new GeographicTilingScheme({
        ellipsoid: imageryProviderBuilder.ellipsoid,
      });
    } else {
      const message = `Tile spatial reference WKID ${data.tileInfo.spatialReference.wkid} is not supported.`;
      throw new RuntimeError(message);
    }
    imageryProviderBuilder.maximumLevel = data.tileInfo.lods.length - 1;

    if (defined(data.fullExtent)) {
      if (
        defined(data.fullExtent.spatialReference) &&
        defined(data.fullExtent.spatialReference.wkid)
      ) {
        if (
          data.fullExtent.spatialReference.wkid === 102100 ||
          data.fullExtent.spatialReference.wkid === 102113
        ) {
          const projection = new WebMercatorProjection();
          const extent = data.fullExtent;
          const sw = projection.unproject(
            new Cartesian3(
              Math.max(
                extent.xmin,
                -imageryProviderBuilder.tilingScheme.ellipsoid.maximumRadius *
                  Math.PI,
              ),
              Math.max(
                extent.ymin,
                -imageryProviderBuilder.tilingScheme.ellipsoid.maximumRadius *
                  Math.PI,
              ),
              0.0,
            ),
          );
          const ne = projection.unproject(
            new Cartesian3(
              Math.min(
                extent.xmax,
                imageryProviderBuilder.tilingScheme.ellipsoid.maximumRadius *
                  Math.PI,
              ),
              Math.min(
                extent.ymax,
                imageryProviderBuilder.tilingScheme.ellipsoid.maximumRadius *
                  Math.PI,
              ),
              0.0,
            ),
          );
          imageryProviderBuilder.rectangle = new Rectangle(
            sw.longitude,
            sw.latitude,
            ne.longitude,
            ne.latitude,
          );
        } else if (data.fullExtent.spatialReference.wkid === 4326) {
          imageryProviderBuilder.rectangle = Rectangle.fromDegrees(
            data.fullExtent.xmin,
            data.fullExtent.ymin,
            data.fullExtent.xmax,
            data.fullExtent.ymax,
          );
        } else {
          const extentMessage = `fullExtent.spatialReference WKID ${data.fullExtent.spatialReference.wkid} is not supported.`;
          throw new RuntimeError(extentMessage);
        }
      }
    } else {
      imageryProviderBuilder.rectangle =
        imageryProviderBuilder.tilingScheme.rectangle;
    }

    imageryProviderBuilder.useTiles = true;
  }

  if (defined(data.copyrightText) && data.copyrightText.length > 0) {
    if (defined(imageryProviderBuilder.credit)) {
      imageryProviderBuilder.tileCredits = [new Credit(data.copyrightText)];
    } else {
      imageryProviderBuilder.credit = new Credit(data.copyrightText);
    }
  }
}

function metadataFailure(resource, error) {
  let message = `An error occurred while accessing ${resource.url}`;
  if (defined(error) && defined(error.message)) {
    message += `: ${error.message}`;
  }

  throw new RuntimeError(message);
}

async function requestMetadata(resource, imageryProviderBuilder) {
  const jsonResource = resource.getDerivedResource({
    queryParameters: {
      f: "json",
    },
  });

  try {
    const data = await jsonResource.fetchJson();
    metadataSuccess(data, imageryProviderBuilder);
  } catch (error) {
    metadataFailure(resource, error);
  }
}

/**
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link ArcGisMapServerImageryProvider.fromBasemapType} or {@link ArcGisMapServerImageryProvider.fromUrl}.
 * </div>
 *
 * Provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
 * used, if available.
 *
 * <br/>
 *
 * An {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/security| ArcGIS Access Token } is required to authenticate requests to an ArcGIS Image Tile service.
 * To access secure ArcGIS resources, it's required to create an ArcGIS developer
 * account or an ArcGIS online account, then implement an authentication method to obtain an access token.
 *
 * @alias ArcGisMapServerImageryProvider
 * @constructor
 *
 * @param {ArcGisMapServerImageryProvider.ConstructorOptions} [options] Object describing initialization options
 *
 * @see ArcGisMapServerImageryProvider.fromBasemapType
 * @see ArcGisMapServerImageryProvider.fromUrl
 *
 * @example
 * // Set the default access token for accessing ArcGIS Image Tile service
 * Cesium.ArcGisMapService.defaultAccessToken = "<ArcGIS Access Token>";
 *
 * // Add a base layer from a default ArcGIS basemap
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   baseLayer: Cesium.ImageryLayer.fromProviderAsync(
 *     Cesium.ArcGisMapServerImageryProvider.fromBasemapType(
 *       Cesium.ArcGisBaseMapType.SATELLITE
 *     )
 *   ),
 * });
 *
 * @example
 * // Create an imagery provider from the url directly
 * const esri = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
 *   "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer", {
 *     token: "<ArcGIS Access Token>"
 * });
 *
 * @see {@link https://developers.arcgis.com/rest/|ArcGIS Server REST API}
 * @see {@link https://developers.arcgis.com/documentation/mapping-apis-and-services/security| ArcGIS Access Token }

 */
function ArcGisMapServerImageryProvider(options) {
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

  this._tileDiscardPolicy = options.tileDiscardPolicy;
  this._tileWidth = defaultValue(options.tileWidth, 256);
  this._tileHeight = defaultValue(options.tileHeight, 256);
  this._maximumLevel = options.maximumLevel;
  this._tilingScheme = defaultValue(
    options.tilingScheme,
    new GeographicTilingScheme({ ellipsoid: options.ellipsoid }),
  );
  this._useTiles = defaultValue(options.usePreCachedTilesIfAvailable, true);
  this._rectangle = defaultValue(
    options.rectangle,
    this._tilingScheme.rectangle,
  );
  this._layers = options.layers;
  this._credit = options.credit;
  this._tileCredits = undefined;

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }

  /**
   * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link ArcGisMapServerImageryProvider#pickFeatures} will
   * invoke the "identify" operation on the ArcGIS server and return the features included in the response.  If false,
   * {@link ArcGisMapServerImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable features)
   * without communicating with the server.
   * @type {boolean}
   * @default true
   */
  this.enablePickFeatures = defaultValue(options.enablePickFeatures, true);

  this._errorEvent = new Event();
}

/**
 * Creates an {@link ImageryProvider} which provides tiled imagery from an ArcGIS base map.
 * @param {ArcGisBaseMapType} style The style of the ArcGIS base map imagery. Valid options are {@link ArcGisBaseMapType.SATELLITE}, {@link ArcGisBaseMapType.OCEANS}, and {@link ArcGisBaseMapType.HILLSHADE}.
 * @param {ArcGisMapServerImageryProvider.ConstructorOptions} [options] Object describing initialization options.
 * @returns {Promise<ArcGisMapServerImageryProvider>} A promise that resolves to the created ArcGisMapServerImageryProvider.
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
 *     Cesium.ArcGisMapServerImageryProvider.fromBasemapType(
 *       Cesium.ArcGisBaseMapType.HILLSHADE, {
 *         token: "<ArcGIS Access Token>"
 *       }
 *     )
 *   ),
 * });
 */

ArcGisMapServerImageryProvider.fromBasemapType = async function (
  style,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("style", style);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  let accessToken;
  let server;
  let warningCredit;
  switch (style) {
    case ArcGisBaseMapType.SATELLITE:
      {
        accessToken = defaultValue(
          options.token,
          ArcGisMapService.defaultAccessToken,
        );
        server = Resource.createIfNeeded(
          ArcGisMapService.defaultWorldImageryServer,
        );
        server.appendForwardSlash();
        const defaultTokenCredit =
          ArcGisMapService.getDefaultTokenCredit(accessToken);
        if (defined(defaultTokenCredit)) {
          warningCredit = Credit.clone(defaultTokenCredit);
        }
      }
      break;
    case ArcGisBaseMapType.OCEANS:
      {
        accessToken = defaultValue(
          options.token,
          ArcGisMapService.defaultAccessToken,
        );
        server = Resource.createIfNeeded(
          ArcGisMapService.defaultWorldOceanServer,
        );
        server.appendForwardSlash();
        const defaultTokenCredit =
          ArcGisMapService.getDefaultTokenCredit(accessToken);
        if (defined(defaultTokenCredit)) {
          warningCredit = Credit.clone(defaultTokenCredit);
        }
      }
      break;
    case ArcGisBaseMapType.HILLSHADE:
      {
        accessToken = defaultValue(
          options.token,
          ArcGisMapService.defaultAccessToken,
        );
        server = Resource.createIfNeeded(
          ArcGisMapService.defaultWorldHillshadeServer,
        );
        server.appendForwardSlash();
        const defaultTokenCredit =
          ArcGisMapService.getDefaultTokenCredit(accessToken);
        if (defined(defaultTokenCredit)) {
          warningCredit = Credit.clone(defaultTokenCredit);
        }
      }
      break;
    default:
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(`Unsupported basemap type: ${style}`);
    //>>includeEnd('debug');
  }

  return ArcGisMapServerImageryProvider.fromUrl(server, {
    ...options,
    token: accessToken,
    credit: warningCredit,
    usePreCachedTilesIfAvailable: true, // ArcGIS Base Map Service Layers only support Tiled views
  });
};

function buildImageResource(imageryProvider, x, y, level, request) {
  let resource;
  if (imageryProvider._useTiles) {
    resource = imageryProvider._resource.getDerivedResource({
      url: `tile/${level}/${y}/${x}`,
      request: request,
    });
  } else {
    const nativeRectangle =
      imageryProvider._tilingScheme.tileXYToNativeRectangle(x, y, level);
    const bbox = `${nativeRectangle.west},${nativeRectangle.south},${nativeRectangle.east},${nativeRectangle.north}`;

    const query = {
      bbox: bbox,
      size: `${imageryProvider._tileWidth},${imageryProvider._tileHeight}`,
      format: "png32",
      transparent: true,
      f: "image",
    };

    if (
      imageryProvider._tilingScheme.projection instanceof GeographicProjection
    ) {
      query.bboxSR = 4326;
      query.imageSR = 4326;
    } else {
      query.bboxSR = 3857;
      query.imageSR = 3857;
    }
    if (imageryProvider.layers) {
      query.layers = `show:${imageryProvider.layers}`;
    }

    resource = imageryProvider._resource.getDerivedResource({
      url: "export",
      request: request,
      queryParameters: query,
    });
  }
  return resource;
}

Object.defineProperties(ArcGisMapServerImageryProvider.prototype, {
  /**
   * Gets the URL of the ArcGIS MapServer.
   * @memberof ArcGisMapServerImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource._url;
    },
  },

  /**
   * Gets the ArcGIS token used to authenticate with the ArcGis MapServer service.
   * @memberof ArcGisMapServerImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  token: {
    get: function () {
      return this._resource.queryParameters.token;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof ArcGisMapServerImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
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
   * @memberof ArcGisMapServerImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets a value indicating whether this imagery provider is using pre-cached tiles from the
   * ArcGIS MapServer.
   * @memberof ArcGisMapServerImageryProvider.prototype
   *
   * @type {boolean}
   * @readonly
   * @default true
   */
  usingPrecachedTiles: {
    get: function () {
      return this._useTiles;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof ArcGisMapServerImageryProvider.prototype
   *
   * @type {boolean}
   * @readonly
   * @default true
   */
  hasAlphaChannel: {
    get: function () {
      return true;
    },
  },

  /**
   * Gets the comma-separated list of layer IDs to show.
   * @memberof ArcGisMapServerImageryProvider.prototype
   *
   * @type {string}
   */
  layers: {
    get: function () {
      return this._layers;
    },
  },
});

/**
 * Creates an {@link ImageryProvider} which provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
 * used, if available.
 *
 * @param {Resource|String} url The URL of the ArcGIS MapServer service.
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
ArcGisMapServerImageryProvider.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const resource = Resource.createIfNeeded(url);
  resource.appendForwardSlash();

  if (defined(options.token)) {
    resource.setQueryParameters({
      token: options.token,
    });
  }

  const provider = new ArcGisMapServerImageryProvider(options);
  provider._resource = resource;
  const imageryProviderBuilder = new ImageryProviderBuilder(options);
  const useTiles = defaultValue(options.usePreCachedTilesIfAvailable, true);
  if (useTiles) {
    await requestMetadata(resource, imageryProviderBuilder);
  }

  imageryProviderBuilder.build(provider);
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
ArcGisMapServerImageryProvider.prototype.getTileCredits = function (
  x,
  y,
  level,
) {
  return this._tileCredits;
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
ArcGisMapServerImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request,
) {
  return ImageryProvider.loadImage(
    this,
    buildImageResource(this, x, y, level, request),
  );
};

/**
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
ArcGisMapServerImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  if (!this.enablePickFeatures) {
    return undefined;
  }

  const rectangle = this._tilingScheme.tileXYToNativeRectangle(x, y, level);

  let horizontal;
  let vertical;
  let sr;
  if (this._tilingScheme.projection instanceof GeographicProjection) {
    horizontal = CesiumMath.toDegrees(longitude);
    vertical = CesiumMath.toDegrees(latitude);
    sr = "4326";
  } else {
    const projected = this._tilingScheme.projection.project(
      new Cartographic(longitude, latitude, 0.0),
    );
    horizontal = projected.x;
    vertical = projected.y;
    sr = "3857";
  }

  let layers = "visible";
  if (defined(this._layers)) {
    layers += `:${this._layers}`;
  }

  const query = {
    f: "json",
    tolerance: 2,
    geometryType: "esriGeometryPoint",
    geometry: `${horizontal},${vertical}`,
    mapExtent: `${rectangle.west},${rectangle.south},${rectangle.east},${rectangle.north}`,
    imageDisplay: `${this._tileWidth},${this._tileHeight},96`,
    sr: sr,
    layers: layers,
  };

  const resource = this._resource.getDerivedResource({
    url: "identify",
    queryParameters: query,
  });

  return resource.fetchJson().then(function (json) {
    const result = [];

    const features = json.results;
    if (!defined(features)) {
      return result;
    }

    for (let i = 0; i < features.length; ++i) {
      const feature = features[i];

      const featureInfo = new ImageryLayerFeatureInfo();
      featureInfo.data = feature;
      featureInfo.name = feature.value;
      featureInfo.properties = feature.attributes;
      featureInfo.configureDescriptionFromProperties(feature.attributes);

      // If this is a point feature, use the coordinates of the point.
      if (feature.geometryType === "esriGeometryPoint" && feature.geometry) {
        const wkid =
          feature.geometry.spatialReference &&
          feature.geometry.spatialReference.wkid
            ? feature.geometry.spatialReference.wkid
            : 4326;
        if (wkid === 4326 || wkid === 4283) {
          featureInfo.position = Cartographic.fromDegrees(
            feature.geometry.x,
            feature.geometry.y,
            feature.geometry.z,
          );
        } else if (wkid === 102100 || wkid === 900913 || wkid === 3857) {
          const projection = new WebMercatorProjection();
          featureInfo.position = projection.unproject(
            new Cartesian3(
              feature.geometry.x,
              feature.geometry.y,
              feature.geometry.z,
            ),
          );
        }
      }

      result.push(featureInfo);
    }

    return result;
  });
};
ArcGisMapServerImageryProvider._metadataCache = {};
export default ArcGisMapServerImageryProvider;
