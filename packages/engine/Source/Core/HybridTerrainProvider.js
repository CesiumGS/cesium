import Credit from "./Credit.js";
import defined from "./defined.js";
import Event from "./Event.js";
import Frozen from "./Frozen.js";

/**
 * @alias HybridTerrainProvider
 * @constructor
 *
 * @param {HybridTerrainProvider.ConstructorOptions} [options] An object describing initialization options
 *
 * @see TerrainProvider
 */
function HybridTerrainProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._defaultProvider = options.defaultProvider;
  this._tilingScheme = options.defaultProvider.tilingScheme;
  this._regions = options.regions ?? [];
  this._availability = options.defaultProvider.availability;

  this._hasWaterMask =
    this._defaultProvider.hasWaterMask ||
    this._regions.some((r) => r.provider.hasWaterMask);
  this._hasVertexNormals =
    this._defaultProvider.hasVertexNormals ||
    this._regions.some((r) => r.provider.hasVertexNormals);

  this._errorEvent = new Event();
  // add error event listeners
  // to forward the registered providers' errors
  this._removeEventListeners = [];
  const seen = new Set();
  const forward = (err) => {
    this._errorEvent.raiseEvent(err);
  };
  for (const region of this._regions) {
    if (seen.has(region.provider)) {
      continue;
    }
    seen.add(region.provider);
    this._removeEventListeners.push(
      region.provider.errorEvent.addEventListener(forward),
    );
  }

  if (!seen.has(this._defaultProvider)) {
    this._removeEventListeners.push(
      this._defaultProvider.errorEvent.addEventListener(forward),
    );
  }

  this._ready = true;
}

Object.defineProperties(HybridTerrainProvider.prototype, {
  /**
   * Gets a value indicating whether or not the provider is ready for use,
   * or a promise that resolves when the provider becomes ready.
   * @memberof HybridTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
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
   * Gets all the credits to display from registered providers when
   * this terrain provider is active. Typically this is used to credit
   * the source of the terrain.
   * @memberof HybridTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      const seen = new Set();
      const parts = [];
      for (const region of this._regions) {
        if (seen.has(region.provider)) {
          continue;
        }

        seen.add(region.provider);
        const html = region.provider.credit?.html;
        if (html) {
          parts.push(html);
        }
      }
      if (!seen.has(this._defaultProvider)) {
        const html = this._defaultProvider.credit?.html;
        if (html) {
          parts.push(html);
        }
      }

      return new Credit(parts.join(" "));
    },
  },

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
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof HybridTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasWaterMask: {
    get: function () {
      return this._hasWaterMask;
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
      return this._hasVertexNormals;
    },
  },
});

/**
 * Makes sure we load availability data for a tile
 *
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
  for (const region of this._regions) {
    if (HybridTerrainProvider.regionContainsTile(region, x, y, level)) {
      return region.provider.loadTileDataAvailability(x, y, level);
    }
  }

  return this._defaultProvider.loadTileDataAvailability(x, y, level);
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level, taken as the
 * worst case across the default provider and all region providers. Because the hybrid
 * provider's coverage is a composition of multiple sources, the reported error reflects
 * the highest error any source could contribute at this level, ensuring the LOD system
 * refines conservatively enough for all sources.
 *
 * @param {number} level The tile level for which to get the maximum geometric error.
 * @returns {number} The maximum geometric error.
 */
HybridTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level,
) {
  let max = this._defaultProvider.getLevelMaximumGeometricError(level);
  for (const region of this._regions) {
    const error = region.provider.getLevelMaximumGeometricError(level);
    if (error > max) {
      max = error;
    }
  }
  return max;
};

/**
 * Requests the terrain for a given tile coordinate.
 *
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
  if (!this._ready) {
    return undefined;
  }

  // Check regions for a match
  for (const region of this._regions) {
    if (HybridTerrainProvider.regionContainsTile(region, x, y, level)) {
      return region.provider.requestTileGeometry(x, y, level, request);
    }
  }

  // Fall back to default provider
  return this._defaultProvider.requestTileGeometry(x, y, level, request);
};

/**
 * Determines whether data for a tile is available to be loaded. Checks the specified terrain regions first.
 *
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {boolean|undefined} Undefined if not supported by the terrain provider, otherwise true or false.
 */
HybridTerrainProvider.prototype.getTileDataAvailable = function (x, y, level) {
  // If any terrain region contains this tile, data is available
  for (let i = 0; i < this._regions.length; ++i) {
    const region = this._regions[i];
    if (HybridTerrainProvider.regionContainsTile(region, x, y, level)) {
      return true;
    }
  }

  // Fall back to default provider
  return this._defaultProvider.getTileDataAvailable(x, y, level);
};

/**
 * Cleans up resources used in the HybridTerrainProvider
 *
 * This method only releases additional resources used to instantiate the HybridTerrainProvider
 */
HybridTerrainProvider.prototype.destroy = function () {
  for (const fn of this._removeEventListeners) {
    fn();
  }

  this._removeEventListeners.length = 0;
  this._ready = false;
};

/**
 * A factory function which creates a HybridTerrainProvider from tile-coordinate based regions.
 *
 * @param {HybridTerrainProvider.TerrainRegion[]} regions Array of regions with tile-coordinate bounds
 * @param {TerrainProvider} defaultProvider Default terrain provider
 * @returns {HybridTerrainProvider} A new HybridTerrainProvider instance
 */
HybridTerrainProvider.fromTileRanges = function (regions, defaultProvider) {
  return new HybridTerrainProvider({
    regions: regions.slice(),
    defaultProvider: defaultProvider,
  });
};

/**
 * @typedef {object} HybridTerrainProvider.ConstructorOptions
 *
 * Initialization options for the HybridTerrainProvider constructor
 *
 * @property {HybridTerrainProvider.TerrainRegion[]} [regions] An array of terrain regions to include in the hybrid terrain.
 * @property {TerrainProvider} defaultProvider Default provider to use outside of specified terrain regions.
 */

/**
 * @typedef {object} HybridTerrainProvider.TerrainRegion
 *
 * Represents a terrain region with provider and geographic bounds.
 *
 * @property {TerrainProvider} provider The terrain provider for this region.
 * @property {Map.<number, {x: (number|number[]), y: (number|number[])}>} [tiles] Tile-coordinate based bounds.
 *   Map of level to tile coordinate ranges for that level.
 * @property {number[]} [levels] Optional level constraints. If specified, region only applies to these levels.
 */

/**
 * Utility functions for working with HybridTerrainProvider.TerrainRegion objects.
 * @namespace
 * @private
 */
HybridTerrainProvider.TerrainRegion = {};

/**
 * Checks if a terrain region contains the specified tile.
 * @param {HybridTerrainProvider.TerrainRegion} region The terrain region to check
 * @param {number} x The X coordinate of the tile
 * @param {number} y The Y coordinate of the tile
 * @param {number} level The zoom level of the tile
 * @returns {boolean} True if the region contains the tile, false otherwise
 */
HybridTerrainProvider.regionContainsTile = function (region, x, y, level) {
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

    // xRange[0] = min x, xRange[1] = max x
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

export default HybridTerrainProvider;
