import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import TerrainProvider from "./TerrainProvider.js";

/**
 * @callback CustomHeightmapTerrainProvider.GeometryCallback
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array|Number[]|Promise.<Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array|Number[]>|undefined} An array or a promise to an array of heights in row-major order. If undefined, the globe will render the parent tile.
 */

/**
 * A simple {@link TerrainProvider} that gets height values from a callback function.
 * It can be used for procedurally generated terrain or as a way to load custom
 * heightmap data without creating a subclass of {@link TerrainProvider}.
 *
 * There are some limitations such as no water mask, no vertex normals, and no
 * availability, so a full-fledged {@link TerrainProvider} subclass is better suited
 * for these more sophisticated use cases.
 *
 * @alias CustomHeightmapTerrainProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {CustomHeightmapTerrainProvider.GeometryCallback} options.callback The callback function for requesting tile geometry.
 * @param {Number} options.width The number of columns per heightmap tile.
 * @param {Number} options.height The number of rows per heightmap tile.
 * @param {TilingScheme} [options.tilingScheme] The tiling scheme specifying how the ellipsoidal
 * surface is broken into tiles. If this parameter is not provided, a {@link GeographicTilingScheme}
 * is used.
 * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 * this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 * parameter is specified, the WGS84 ellipsoid is used.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   terrainProvider: new Cesium.CustomHeightmapTerrainProvider({
 *     width: 32,
 *     height: 32,
 *     callback: function (x, y, level) {
 *       return new Float32Array(32 * 32); // all zeros
 *     },
 *   }),
 * });
 *
 * @see TerrainProvider
 */
function CustomHeightmapTerrainProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.callback", options.callback);
  Check.defined("options.width", options.width);
  Check.defined("options.height", options.height);
  //>>includeEnd('debug');

  this._callback = options.callback;

  this._tilingScheme = options.tilingScheme;
  if (!defined(this._tilingScheme)) {
    this._tilingScheme = new GeographicTilingScheme({
      ellipsoid: defaultValue(options.ellipsoid, Ellipsoid.WGS84),
    });
  }

  this._width = options.width;
  this._height = options.height;
  const maxTileDimensions = Math.max(this._width, this._height);

  this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    this._tilingScheme.ellipsoid,
    maxTileDimensions,
    this._tilingScheme.getNumberOfXTilesAtLevel(0)
  );

  this._errorEvent = new Event();

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._readyPromise = Promise.resolve(true);
}

Object.defineProperties(CustomHeightmapTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error. By subscribing
   * to the event, you will be notified of the error and can potentially recover from it. Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active. Typically this is used to credit
   * the source of the terrain.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return true;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask. The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * Water mask is not supported by {@link CustomHeightmapTerrainProvider}, so the return
   * value will always be false.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasWaterMask: {
    get: function () {
      return false;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * Vertex normals are not supported by {@link CustomHeightmapTerrainProvider}, so the return
   * value will always be false.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasVertexNormals: {
    get: function () {
      return false;
    },
  },

  /**
   * Gets the number of columns per heightmap tile.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  width: {
    get: function () {
      return this._width;
    },
  },

  /**
   * Gets the number of rows per heightmap tile.
   * @memberof CustomHeightmapTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  height: {
    get: function () {
      return this._height;
    },
  },
});

/**
 * Requests the geometry for a given tile. The result includes terrain
 * data and indicates that all child tiles are available.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 *
 * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry. If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 */
CustomHeightmapTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  const promise = this._callback(x, y, level);
  if (!defined(promise)) {
    return undefined;
  }

  const width = this._width;
  const height = this._height;

  return Promise.resolve(promise).then(function (heightmapData) {
    let buffer = heightmapData;
    if (Array.isArray(buffer)) {
      // HeightmapTerrainData expects a TypedArray, so convert from Number[] to Float64Array
      buffer = new Float64Array(buffer);
    }

    return new HeightmapTerrainData({
      buffer: buffer,
      width: width,
      height: height,
    });
  });
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error.
 */
CustomHeightmapTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  return this._levelZeroMaximumGeometricError / (1 << level);
};

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Boolean|undefined} Undefined if not supported, otherwise true or false.
 */
CustomHeightmapTerrainProvider.prototype.getTileDataAvailable = function (
  x,
  y,
  level
) {
  return undefined;
};

/**
 * Makes sure we load availability data for a tile
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Promise.<void>|undefined} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
 */
CustomHeightmapTerrainProvider.prototype.loadTileDataAvailability = function (
  x,
  y,
  level
) {
  return undefined;
};
export default CustomHeightmapTerrainProvider;
