import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import loadKTX2 from "../Core/loadKTX2.js";
import Resource from "../Core/Resource.js";

/**
 * @typedef {HTMLImageElement|HTMLCanvasElement|ImageBitmap} ImageryTypes
 *
 * The format in which {@link ImageryProvider} methods return an image may
 * vary by provider, configuration, or server settings.  Most common are
 * <code>HTMLImageElement</code>, <code>HTMLCanvasElement</code>, or on supported
 * browsers, <code>ImageBitmap</code>.
 *
 * See the documentation for each ImageryProvider class for more information about how they return images.
 */

/**
 * Provides imagery to be displayed on the surface of an ellipsoid.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias ImageryProvider
 * @constructor
 * @abstract
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see OpenStreetMapImageryProvider
 * @see TileMapServiceImageryProvider
 * @see GoogleEarthEnterpriseImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see GridImageryProvider
 * @see IonImageryProvider
 * @see MapboxImageryProvider
 * @see MapboxStyleImageryProvider
 * @see SingleTileImageryProvider
 * @see TileCoordinatesImageryProvider
 * @see UrlTemplateImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers.html|Cesium Sandcastle Imagery Layers Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
 */
function ImageryProvider() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(ImageryProvider.prototype, {
  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof ImageryProvider.prototype
   * @type {boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof ImageryProvider.prototype
   * @type {Promise<boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by the instance.
   * @memberof ImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof ImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileWidth: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof ImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileHeight: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof ImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the minimum level-of-detail that can be requested.  Generally,
   * a minimum level should only be used when the rectangle of the imagery is small
   * enough that the number of tiles at the minimum level is small.  An imagery
   * provider with more than a few tiles at the minimum level will lead to
   * rendering problems.
   * @memberof ImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the tiling scheme used by the provider.
   * @memberof ImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof ImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof ImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof ImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof ImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
   * and texture upload time are reduced.
   * @memberof ImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultAlpha: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultNightAlpha: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultDayAlpha: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultBrightness: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultContrast: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultHue: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultSaturation: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   * @memberof ImageryProvider.prototype
   * @type {Number|undefined}
   * @deprecated
   */
  defaultGamma: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default texture minification filter to apply to this provider.
   * @memberof ImageryProvider.prototype
   * @type {TextureMinificationFilter}
   * @deprecated
   */
  defaultMinificationFilter: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
  },

  /**
   * The default texture magnification filter to apply to this provider.
   * @memberof ImageryProvider.prototype
   * @type {TextureMagnificationFilter}
   * @deprecated
   */
  defaultMagnificationFilter: {
    get: DeveloperError.throwInstantiationError,
    set: DeveloperError.throwInstantiationError,
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
ImageryProvider.prototype.getTileCredits = function (x, y, level) {
  DeveloperError.throwInstantiationError();
};

/**
 * Requests the image for a given tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<ImageryTypes>|undefined} Returns a promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
ImageryProvider.prototype.requestImage = function (x, y, level, request) {
  DeveloperError.throwInstantiationError();
};

/**
 * Asynchronously determines what features, if any, are located at a given longitude and latitude within
 * a tile.
 * This function is optional, so it may not exist on all ImageryProviders.
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
 *
 */
ImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  DeveloperError.throwInstantiationError();
};

const ktx2Regex = /\.ktx2$/i;

/**
 * Loads an image from a given URL.  If the server referenced by the URL already has
 * too many requests pending, this function will instead return undefined, indicating
 * that the request should be retried later.
 *
 * @param {ImageryProvider} imageryProvider The imagery provider for the URL.
 * @param {Resource|string} url The URL of the image.
 * @returns {Promise<ImageryTypes|CompressedTextureBuffer>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
ImageryProvider.loadImage = function (imageryProvider, url) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  const resource = Resource.createIfNeeded(url);

  if (ktx2Regex.test(resource.url)) {
    // Resolves with `CompressedTextureBuffer`
    return loadKTX2(resource);
  } else if (
    defined(imageryProvider) &&
    defined(imageryProvider.tileDiscardPolicy)
  ) {
    // Resolves with `HTMLImageElement` or `ImageBitmap`
    return resource.fetchImage({
      preferBlob: true,
      preferImageBitmap: true,
      flipY: true,
    });
  }

  return resource.fetchImage({
    preferImageBitmap: true,
    flipY: true,
  });
};
export default ImageryProvider;
