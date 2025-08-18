import Check from "./Check.js";
import defined from "./defined.js";
import EllipsoidTerrainProvider from "./EllipsoidTerrainProvider.js";
import Event from "./Event.js";
import Frozen from "./Frozen.js";

/**
 * A terrain provider that delegates requests to different terrain providers
 * based on geographic regions and zoom levels. This allows combining
 * multiple terrain sources into a single seamless terrain.
 *
 * @alias HybridTerrainProvider
 * @constructor
 *
 * @param {HybridTerrainProvider.ConstructorOptions} options
 *
 * @example
 * // tile-coordinate based control
 * const tileRanges = new Map();
 * tileRanges.set(15, { x: [55852, 55871], y: [9556, 9575] });
 * tileRanges.set(16, { x: [111704, 111742], y: [19112, 19150] });
 *
 * const hybridTerrain = new Cesium.HybridTerrainProvider({
 *   regions: [
 *     {
 *       provider: customProvider,
 *       tiles: tileRanges
 *     }
 *   ],
 *   defaultProvider: worldTerrain
 * });
 *
 * viewer.terrainProvider = hybridTerrain;
 *
 * @see TerrainProvider
 */
function HybridTerrainProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.defaultProvider", options.defaultProvider);
  //>>includeEnd('debug');

  this._defaultProvider = options.defaultProvider;
  this._fallbackProvider =
    options.fallbackProvider ?? new EllipsoidTerrainProvider();
  this._tilingScheme = options.defaultProvider.tilingScheme;
  this._regions = options.regions ?? [];
  this._availability = options.defaultProvider.availability;
  this._errorEvent = new Event();
}

Object.defineProperties(HybridTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof HybridTerrainProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
   * the source of the terrain.
   * @memberof HybridTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._defaultProvider?.credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof HybridTerrainProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof HybridTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasWaterMask: {
    get: function () {
      return this._defaultProvider.hasWaterMask;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * @memberof HybridTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasVertexNormals: {
    get: function () {
      return this._defaultProvider.hasVertexNormals;
    },
  },

  /**
   * Gets an object that can be used to determine availability of terrain from this provider.
   * @memberof HybridTerrainProvider.prototype
   * @type {TileAvailability}
   * @readonly
   */
  availability: {
    get: function () {
      return this._availability;
    },
  },

  /**
   * Gets the list of terrain regions managed by this provider.
   * @memberof HybridTerrainProvider.prototype
   * @type {HybridTerrainProvider.TerrainRegion[]}
   * @readonly
   */
  regions: {
    get: function () {
      return this._regions.slice();
    },
  },

  /**
   * Gets the default terrain provider.
   * @memberof HybridTerrainProvider.prototype
   * @type {TerrainProvider}
   * @readonly
   */
  defaultProvider: {
    get: function () {
      return this._defaultProvider;
    },
  },

  /**
   * Gets the fallback terrain provider.
   * @memberof HybridTerrainProvider.prototype
   * @type {TerrainProvider}
   * @readonly
   */
  fallbackProvider: {
    get: function () {
      return this._fallbackProvider;
    },
  },
});

/**
 * Makes sure we load availability data for a tile
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {undefined|Promise<void>} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
 */
HybridTerrainProvider.prototype.loadTileDataAvailability = function (
  x,
  y,
  level,
) {
  return this._defaultProvider.loadTileDataAvailability(x, y, level);
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 * @param {number} level The tile level for which to get the maximum geometric error.
 * @returns {number} The maximum geometric error.
 */
HybridTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level,
) {
  return this._defaultProvider.getLevelMaximumGeometricError(level);
};

/**
 * Requests the terrain for a given tile coordinate.
 * @param {number} x The X coordinate of the tile.
 * @param {number} y The Y coordinate of the tile.
 * @param {number} level The zoom level of the tile.
 * @param {Request} [request] The request.
 * @returns {Promise<TerrainData>|undefined} A promise for the requested terrain.
 */
HybridTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request,
) {
  // Check regions for a match
  for (let i = 0; i < this._regions.length; ++i) {
    const region = this._regions[i];
    if (this._regionContains(region, x, y, level)) {
      return region.provider.requestTileGeometry(x, y, level, request);
    }
  }

  // Fall back to default provider
  if (this._defaultProvider.getTileDataAvailable(x, y, level)) {
    return this._defaultProvider.requestTileGeometry(x, y, level, request);
  }

  // Final fallback
  return this._fallbackProvider.requestTileGeometry(x, y, level, request);
};

/**
 * Determines whether data for a tile is available to be loaded. Checks the specified terrain regions first.
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {boolean|undefined} Undefined if not supported by the terrain provider, otherwise true or false.
 */
HybridTerrainProvider.prototype.getTileDataAvailable = function (x, y, level) {
  // First check if any terrain region contains this tile AND has data
  for (let i = 0; i < this._regions.length; ++i) {
    const region = this._regions[i];
    if (this._regionContains(region, x, y, level)) {
      const available = region.provider.getTileDataAvailable(x, y, level);
      if (available) {
        return true; // Found a provider with data
      }
      // Continue searching if this provider has no data (false)
    }
  }

  // Fall back to default provider
  return this._defaultProvider.getTileDataAvailable(x, y, level);
};

/**
 * Checks if a terrain region contains the specified tile.
 * @private
 */
HybridTerrainProvider.prototype._regionContains = function (
  region,
  x,
  y,
  level,
) {
  // Check level constraints if specified
  if (defined(region.levels) && region.levels.indexOf(level) === -1) {
    return false;
  }

  // Tile-coordinate based bounds
  if (defined(region.tiles)) {
    const tileRange = region.tiles.get(level);
    if (!defined(tileRange)) {
      return false;
    }

    const xRange = Array.isArray(tileRange.x)
      ? tileRange.x
      : [tileRange.x, tileRange.x];
    const yRange = Array.isArray(tileRange.y)
      ? tileRange.y
      : [tileRange.y, tileRange.y];

    return x >= xRange[0] && x <= xRange[1] && y >= yRange[0] && y <= yRange[1];
  }

  return false;
};

/**
 * Creates a HybridTerrainProvider from tile-coordinate based regions.
 * @param {HybridTerrainProvider.TerrainRegion[]} regions Array of regions with tile-coordinate bounds
 * @param {TerrainProvider} defaultProvider Default terrain provider
 * @param {TerrainProvider} [fallbackProvider] Optional fallback provider
 * @returns {HybridTerrainProvider} A new HybridTerrainProvider instance
 */
HybridTerrainProvider.fromTerrainRegions = function (
  regions,
  defaultProvider,
  fallbackProvider,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("regions", regions);
  Check.defined("defaultProvider", defaultProvider);
  //>>includeEnd('debug');

  return new HybridTerrainProvider({
    regions: regions.slice(),
    defaultProvider: defaultProvider,
    fallbackProvider: fallbackProvider,
  });
};

export default HybridTerrainProvider;

/**
 * Constructor options for `HybridTerrainProvider`.
 * @typedef {object} HybridTerrainProvider.ConstructorOptions
 * @property {HybridTerrainProvider.TerrainRegion[]} [regions] An array of terrain regions to include in the hybrid terrain.
 * @property {TerrainProvider} defaultProvider Default provider to use outside of specified terrain regions.
 * @property {TerrainProvider} [fallbackProvider] Optional fallback provider when data is not available from default provider.
 */

/**
 * Represents a terrain region with provider and geographic bounds.
 * @typedef {object} HybridTerrainProvider.TerrainRegion
 * @property {TerrainProvider} provider The terrain provider for this region.
 * @property {Map<number, {x: (number|number[]), y: (number|number[])}>} tiles Tile-coordinate based bounds.
 *   Map of level to tile coordinate ranges for that level.
 * @property {number[]} [levels] Optional level constraints. If specified, region only applies to these levels.
 */
