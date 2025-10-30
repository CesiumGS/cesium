import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import Credit from "../Core/Credit.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import IonResource from "../Core/IonResource.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

const trailingSlashRegex = /\/$/;

/**
 * @typedef {object} Azure2DImageryProvider.ConstructorOptions
 *
 * Initialization options for the Azure2DImageryProvider constructor
 *
 * @property {object} options Object with the following properties:
 * @property {string} [options.url="https://atlas.microsoft.com/"] The Azure server url.
 * @property {string} options.tilesetId="microsoft.imagery" The Azure tileset ID. Valid options are {@link microsoft.imagery}, {@link microsoft.base.road}, and {@link microsoft.base.labels.road}
 * @property {string} options.subscriptionKey The public subscription key for the imagery.
 * @property {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid.  If not specified, the default ellipsoid is used.
 * @property {number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {number} [options.maximumLevel=22] The maximum level-of-detail supported by the imagery provider.
 * @property {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 */

/**
 * Provides 2D image tiles from Azure.
 *
 * @alias Azure2DImageryProvider
 * @constructor
 * @private
 * @param {Azure2DImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Azure 2D imagery provider
 * const azureImageryProvider = new Cesium.Azure2DImageryProvider({
 *     subscriptionKey: "subscription-key",
 *     tilesetId: "microsoft.base.road"
 * });
 */
function Azure2DImageryProvider(options) {
  options = options ?? {};
  const tilesetId = options.tilesetId ?? "microsoft.imagery";
  this._maximumLevel = options.maximumLevel ?? 22;
  this._minimumLevel = options.minimumLevel ?? 0;

  this._subscriptionKey =
    options.subscriptionKey ?? options["subscription-key"];
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.subscriptionKey", this._subscriptionKey);
  //>>includeEnd('debug');

  this._tilesetId = options.tilesetId;

  const resource =
    options.url instanceof IonResource
      ? options.url
      : Resource.createIfNeeded(options.url ?? "https://atlas.microsoft.com/");

  let templateUrl = resource.getUrlComponent();
  if (!trailingSlashRegex.test(templateUrl)) {
    templateUrl += "/";
  }

  const tilesUrl = `${templateUrl}map/tile`;
  this._viewportUrl = `${templateUrl}map/attribution`;

  resource.url = tilesUrl;

  resource.setQueryParameters({
    "api-version": "2024-04-01",
    tilesetId: tilesetId,
    zoom: `{z}`,
    x: `{x}`,
    y: `{y}`,
    "subscription-key": this._subscriptionKey,
  });

  let credit;
  if (defined(options.credit)) {
    credit = options.credit;
    if (typeof credit === "string") {
      credit = new Credit(credit);
    }
  }

  const provider = new UrlTemplateImageryProvider({
    ...options,
    maximumLevel: this._maximumLevel,
    minimumLevel: this._minimumLevel,
    url: resource,
    credit: credit,
  });
  provider._resource = resource;
  this._imageryProvider = provider;

  // This will be defined for ion resources
  this._tileCredits = resource.credits;
  this._attributionsByLevel = undefined;
  // Asynchronously request and populate _attributionsByLevel
  this.getViewportCredits();
}

Object.defineProperties(Azure2DImageryProvider.prototype, {
  /**
   * Gets the URL of the Azure 2D Imagery server.
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
   * @memberof Azure2DImageryProvider.prototype
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
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]|undefined} The credits to be displayed when the tile is displayed.
 */
Azure2DImageryProvider.prototype.getTileCredits = function (x, y, level) {
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
Azure2DImageryProvider.prototype.requestImage = function (
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
Azure2DImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude,
) {
  return undefined;
};

/**
 * Get attribution for imagery from Azure Maps to display in the credits
 * @private
 * @return {Promise<Map<Credit[]>>} The list of attribution sources to display in the credits.
 */
Azure2DImageryProvider.prototype.getViewportCredits = async function () {
  const maximumLevel = this._maximumLevel;

  const promises = [];
  for (let level = 0; level < maximumLevel + 1; level++) {
    promises.push(
      fetchViewportAttribution(
        this._viewportUrl,
        this._subscriptionKey,
        this._tilesetId,
        level,
      ),
    );
  }
  const results = await Promise.all(promises);

  const attributionsByLevel = new Map();
  for (let level = 0; level < maximumLevel + 1; level++) {
    const credits = [];
    const attributions = results[level].join(",");
    if (attributions) {
      const levelCredits = new Credit(attributions);
      credits.push(levelCredits);
    }
    attributionsByLevel.set(level, credits);
  }

  this._attributionsByLevel = attributionsByLevel;

  return attributionsByLevel;
};

async function fetchViewportAttribution(url, key, tilesetId, level) {
  const viewport = await Resource.fetch({
    url: url,
    queryParameters: {
      tilesetId,
      "subscription-key": key,
      "api-version": "2024-04-01",
      zoom: level,
      bounds: "-180,-90,180,90",
    },
    data: JSON.stringify(Frozen.EMPTY_OBJECT),
  });
  const viewportJson = JSON.parse(viewport);
  return viewportJson.copyrights;
}

// Exposed for tests
export default Azure2DImageryProvider;
