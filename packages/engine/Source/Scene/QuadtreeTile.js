// @ts-check

import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Rectangle from "../Core/Rectangle.js";
import Cartographic from "../Core/Cartographic.js";
import QuadtreeTileLoadState from "./QuadtreeTileLoadState.js";
import TileSelectionResult from "./TileSelectionResult.js";

/** @import TilingScheme from "../Core/TilingScheme.js"; */

/**
 * A simple Least Recently Used (LRU) cache implementation.
 *
 * @private
 */
class LRUCache {
  /** @param {number} maxSize */
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * @param {unknown} key
   * @returns {unknown}
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move accessed item to the end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * @param {unknown} key
   * @param {unknown} value
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove the least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * @type {number}
   * @readonly
   */
  get size() {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
  }
}

// Maximum cache entries per tile
const MAX_CACHE_ENTRIES = 1000;

/**
 * A single tile in a {@link QuadtreePrimitive}.
 *
 * @private
 */
class QuadtreeTile {
  /**
   * @param {object} options
   * @param {number} options.level The level of the tile in the quadtree.
   * @param {number} options.x The X coordinate of the tile in the quadtree.  0 is the westernmost tile.
   * @param {number} options.y The Y coordinate of the tile in the quadtree.  0 is the northernmost tile.
   * @param {TilingScheme} options.tilingScheme The tiling scheme in which this tile exists.
   * @param {QuadtreeTile} [options.parent] This tile's parent, or undefined if this is a root tile.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options)) {
      throw new DeveloperError("options is required.");
    }
    if (!defined(options.x)) {
      throw new DeveloperError("options.x is required.");
    } else if (!defined(options.y)) {
      throw new DeveloperError("options.y is required.");
    } else if (options.x < 0 || options.y < 0) {
      throw new DeveloperError(
        "options.x and options.y must be greater than or equal to zero.",
      );
    }
    if (!defined(options.level)) {
      throw new DeveloperError(
        "options.level is required and must be greater than or equal to zero.",
      );
    }
    if (!defined(options.tilingScheme)) {
      throw new DeveloperError("options.tilingScheme is required.");
    }
    //>>includeEnd('debug');

    this._tilingScheme = options.tilingScheme;
    this._x = options.x;
    this._y = options.y;
    this._level = options.level;
    this._parent = options.parent;

    /** @type {Rectangle} */
    this._rectangle = this._tilingScheme.tileXYToRectangle(
      this._x,
      this._y,
      this._level,
    );

    this._southwestChild = undefined;
    this._southeastChild = undefined;
    this._northwestChild = undefined;
    this._northeastChild = undefined;

    // TileReplacementQueue gets/sets these private properties.
    this.replacementPrevious = undefined;
    this.replacementNext = undefined;

    // The distance from the camera to this tile, updated when the tile is selected
    // for rendering.  We can get rid of this if we have a better way to sort by
    // distance - for example, by using the natural ordering of a quadtree.
    // QuadtreePrimitive gets/sets this private property.
    this._distance = 0.0;
    this._loadPriority = 0.0;

    this._customData = new Set();
    this._customDataIterator = undefined;
    /** @type {unknown[]} */
    this._addedCustomData = [];
    /** @type {unknown[]} */
    this._removedCustomData = [];
    this._lastSelectionResult = TileSelectionResult.NONE;
    this._lastSelectionResultFrame = undefined;
    this._loadedCallbacks = {};

    // Cache for storing computed position values per tile to avoid redundant calculations
    this._positionCache = new LRUCache(MAX_CACHE_ENTRIES);

    /**
     * Gets or sets the current state of the tile in the tile load pipeline.
     * @type {QuadtreeTileLoadState}
     * @default {@link QuadtreeTileLoadState.START}
     */
    this.state = QuadtreeTileLoadState.START;

    /**
     * Gets or sets a value indicating whether or not the tile is currently renderable.
     * @type {boolean}
     * @default false
     */
    this.renderable = false;

    /**
     * Gets or set a value indicating whether or not the tile was entirely upsampled from its
     * parent tile.  If all four children of a parent tile were upsampled from the parent,
     * we will render the parent instead of the children even if the LOD indicates that
     * the children would be preferable.
     * @type {boolean}
     * @default false
     */
    this.upsampledFromParent = false;

    /**
     * Gets or sets the additional data associated with this tile.  The exact content is specific to the
     * {@link QuadtreeTileProvider}.
     * @type {object}
     * @default undefined
     */
    this.data = undefined;
  }

  /**
   * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
   *
   *
   * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
   * @returns {QuadtreeTile[]} An array containing the tiles at level of detail zero, starting with the
   * tile in the northwest corner and followed by the tile (if any) to its east.
   */
  static createLevelZeroTiles(tilingScheme) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(tilingScheme)) {
      throw new DeveloperError("tilingScheme is required.");
    }
    //>>includeEnd('debug');

    const numberOfLevelZeroTilesX = tilingScheme.getNumberOfXTilesAtLevel(0);
    const numberOfLevelZeroTilesY = tilingScheme.getNumberOfYTilesAtLevel(0);

    const result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

    let index = 0;
    for (let y = 0; y < numberOfLevelZeroTilesY; ++y) {
      for (let x = 0; x < numberOfLevelZeroTilesX; ++x) {
        result[index++] = new QuadtreeTile({
          tilingScheme: tilingScheme,
          x: x,
          y: y,
          level: 0,
        });
      }
    }

    return result;
  }

  /**
   * Generates a unique cache key for a given cartographic position.
   *
   * @param {Cartographic} cartographic The cartographic coordinates.
   * @param {number} maximumScreenSpaceError The maximum screen-space error, in pixels, that is allowed.
   *        A higher maximum error will render fewer tiles and improve performance, while a lower
   *        value will improve visual quality.
   * @returns {string} A string representing the spatial hash key.
   */
  _getCacheKey(cartographic, maximumScreenSpaceError) {
    return createSpatialHashKey(
      cartographic.longitude,
      cartographic.latitude,
      this._rectangle,
      maximumScreenSpaceError,
    );
  }

  /**
   * Retrieves a cached position for the specified cartographic position.
   *
   *
   * @param {Cartographic} cartographic - The cartographic coordinates.
   * @param {number} maximumScreenSpaceError The maximum screen-space error, in pixels, that is allowed.
   *        A higher maximum error will render fewer tiles and improve performance, while a lower
   *        value will improve visual quality.
   * @returns {object|undefined} The cached position data or undefined if not found.
   */
  getPositionCacheEntry(cartographic, maximumScreenSpaceError) {
    const result = this._positionCache.get(
      this._getCacheKey(cartographic, maximumScreenSpaceError),
    );
    return /** @type {object|undefined} */ (result);
  }

  /**
   * Sets a position on the cache for this tile.
   *
   *
   * @param {Cartographic} cartographic - The cartographic coordinates.
   * @param {number} maximumScreenSpaceError The maximum screen-space error, in pixels, that is allowed.
   *        A higher maximum error will render fewer tiles and improve performance, while a lower
   *        value will improve visual quality.
   * @param {object} value - The object to be cached.
   */
  setPositionCacheEntry(cartographic, maximumScreenSpaceError, value) {
    this._positionCache.set(
      this._getCacheKey(cartographic, maximumScreenSpaceError),
      value,
    );
  }

  /**
   * Clears the position cache for this tile.
   * This function removes all cached positions that were previously stored
   * to optimize height computations.
   *
   */
  clearPositionCache() {
    if (this._positionCache.size > 0) {
      this._positionCache.clear();
    }
  }

  updateCustomData() {
    const added = this._addedCustomData;
    const removed = this._removedCustomData;
    if (added.length === 0 && removed.length === 0) {
      return;
    }

    const customData = this.customData;
    for (let i = 0; i < added.length; ++i) {
      const data = /** @type {*} */ (added[i]);
      customData.add(data);

      const child = childTileAtPosition(this, data.positionCartographic);
      child._addedCustomData.push(data);
    }
    this._addedCustomData.length = 0;

    for (let i = 0; i < removed.length; ++i) {
      const data = /** @type {*} */ (removed[i]);
      if (customData.has(data)) {
        customData.delete(data);
      }

      const child = childTileAtPosition(this, data.positionCartographic);
      child._removedCustomData.push(data);
    }
    this._removedCustomData.length = 0;
  }

  /**
   * Gets the tiling scheme used to tile the surface.
   * @type {TilingScheme}
   */
  get tilingScheme() {
    return this._tilingScheme;
  }

  /**
   * Gets the tile X coordinate.
   * @type {number}
   */
  get x() {
    return this._x;
  }

  /**
   * Gets the tile Y coordinate.
   * @type {number}
   */
  get y() {
    return this._y;
  }

  /**
   * Gets the level-of-detail, where zero is the coarsest, least-detailed.
   * @type {number}
   */
  get level() {
    return this._level;
  }

  /**
   * Gets the parent tile of this tile.
   * @type {QuadtreeTile}
   */
  get parent() {
    return this._parent;
  }

  /**
   * Gets the cartographic rectangle of the tile, with north, south, east and
   * west properties in radians.
   * @type {Rectangle}
   */
  get rectangle() {
    return this._rectangle;
  }

  /**
   * An array of tiles that is at the next level of the tile tree.
   * @type {QuadtreeTile[]}
   */
  get children() {
    return [
      this.northwestChild,
      this.northeastChild,
      this.southwestChild,
      this.southeastChild,
    ];
  }

  /**
   * Gets the southwest child tile.
   * @type {QuadtreeTile}
   */
  get southwestChild() {
    if (!defined(this._southwestChild)) {
      this._southwestChild = new QuadtreeTile({
        tilingScheme: this.tilingScheme,
        x: this.x * 2,
        y: this.y * 2 + 1,
        level: this.level + 1,
        parent: this,
      });
    }
    return this._southwestChild;
  }

  /**
   * Gets the southeast child tile.
   * @type {QuadtreeTile}
   */
  get southeastChild() {
    if (!defined(this._southeastChild)) {
      this._southeastChild = new QuadtreeTile({
        tilingScheme: this.tilingScheme,
        x: this.x * 2 + 1,
        y: this.y * 2 + 1,
        level: this.level + 1,
        parent: this,
      });
    }
    return this._southeastChild;
  }

  /**
   * Gets the northwest child tile.
   * @type {QuadtreeTile}
   */
  get northwestChild() {
    if (!defined(this._northwestChild)) {
      this._northwestChild = new QuadtreeTile({
        tilingScheme: this.tilingScheme,
        x: this.x * 2,
        y: this.y * 2,
        level: this.level + 1,
        parent: this,
      });
    }
    return this._northwestChild;
  }

  /**
   * Gets the northeast child tile.
   * @type {QuadtreeTile}
   */
  get northeastChild() {
    if (!defined(this._northeastChild)) {
      this._northeastChild = new QuadtreeTile({
        tilingScheme: this.tilingScheme,
        x: this.x * 2 + 1,
        y: this.y * 2,
        level: this.level + 1,
        parent: this,
      });
    }
    return this._northeastChild;
  }

  /**
   * A set of objects associated with this tile.
   * @type {Set<*>}
   */
  get customData() {
    return this._customData;
  }

  /**
   * Gets a value indicating whether or not this tile needs further loading.
   * This property will return true if the {@link QuadtreeTile#state} is
   * <code>START</code> or <code>LOADING</code>.
   * @type {boolean}
   */
  get needsLoading() {
    return this.state < QuadtreeTileLoadState.DONE;
  }

  /**
   * Gets a value indicating whether or not this tile is eligible to be unloaded.
   * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
   * such as a request for data, is in progress on it.  A tile will never be
   * unloaded while it is needed for rendering, regardless of the value of this
   * property.  If {@link QuadtreeTile#data} is defined and has an
   * <code>eligibleForUnloading</code> property, the value of that property is returned.
   * Otherwise, this property returns true.
   * @type {boolean}
   */
  get eligibleForUnloading() {
    let result = true;

    if (defined(this.data)) {
      result = /** @type {*} */ (this.data).eligibleForUnloading;
      if (!defined(result)) {
        result = true;
      }
    }

    return result;
  }

  /**
   * @param {QuadtreeTile[]} levelZeroTiles
   * @param {number} x
   * @param {number} y
   * @returns {QuadtreeTile}
   */
  findLevelZeroTile(levelZeroTiles, x, y) {
    const xTiles = this.tilingScheme.getNumberOfXTilesAtLevel(0);
    if (x < 0) {
      x += xTiles;
    } else if (x >= xTiles) {
      x -= xTiles;
    }

    if (y < 0 || y >= this.tilingScheme.getNumberOfYTilesAtLevel(0)) {
      return undefined;
    }

    return levelZeroTiles.filter(function (tile) {
      return tile.x === x && tile.y === y;
    })[0];
  }

  /**
   * @param {QuadtreeTile[]} levelZeroTiles
   * @returns {QuadtreeTile|undefined}
   */
  findTileToWest(levelZeroTiles) {
    const parent = this.parent;
    if (parent === undefined) {
      return this.findLevelZeroTile(levelZeroTiles, this.x - 1, this.y);
    }

    if (parent.southeastChild === this) {
      return parent.southwestChild;
    } else if (parent.northeastChild === this) {
      return parent.northwestChild;
    }

    const westOfParent = parent.findTileToWest(levelZeroTiles);
    if (westOfParent === undefined) {
      return undefined;
    } else if (parent.southwestChild === this) {
      return westOfParent.southeastChild;
    }
    return westOfParent.northeastChild;
  }

  /**
   * @param {QuadtreeTile[]} levelZeroTiles
   * @returns {QuadtreeTile|undefined}
   */
  findTileToEast(levelZeroTiles) {
    const parent = this.parent;
    if (parent === undefined) {
      return this.findLevelZeroTile(levelZeroTiles, this.x + 1, this.y);
    }

    if (parent.southwestChild === this) {
      return parent.southeastChild;
    } else if (parent.northwestChild === this) {
      return parent.northeastChild;
    }

    const eastOfParent = parent.findTileToEast(levelZeroTiles);
    if (eastOfParent === undefined) {
      return undefined;
    } else if (parent.southeastChild === this) {
      return eastOfParent.southwestChild;
    }
    return eastOfParent.northwestChild;
  }

  /**
   * @param {QuadtreeTile[]} levelZeroTiles
   * @returns {QuadtreeTile|undefined}
   */
  findTileToSouth(levelZeroTiles) {
    const parent = this.parent;
    if (parent === undefined) {
      return this.findLevelZeroTile(levelZeroTiles, this.x, this.y + 1);
    }

    if (parent.northwestChild === this) {
      return parent.southwestChild;
    } else if (parent.northeastChild === this) {
      return parent.southeastChild;
    }

    const southOfParent = parent.findTileToSouth(levelZeroTiles);
    if (southOfParent === undefined) {
      return undefined;
    } else if (parent.southwestChild === this) {
      return southOfParent.northwestChild;
    }
    return southOfParent.northeastChild;
  }

  /**
   * @param {QuadtreeTile[]} levelZeroTiles
   * @returns {QuadtreeTile|undefined}
   */
  findTileToNorth(levelZeroTiles) {
    const parent = this.parent;
    if (parent === undefined) {
      return this.findLevelZeroTile(levelZeroTiles, this.x, this.y - 1);
    }

    if (parent.southwestChild === this) {
      return parent.northwestChild;
    } else if (parent.southeastChild === this) {
      return parent.northeastChild;
    }

    const northOfParent = parent.findTileToNorth(levelZeroTiles);
    if (northOfParent === undefined) {
      return undefined;
    } else if (parent.northwestChild === this) {
      return northOfParent.southwestChild;
    }
    return northOfParent.southeastChild;
  }

  /**
   * Frees the resources associated with this tile and returns it to the <code>START</code>
   * {@link QuadtreeTileLoadState}.  If the {@link QuadtreeTile#data} property is defined and it
   * has a <code>freeResources</code> method, the method will be invoked.
   *
   */
  freeResources() {
    // Clears cached heights when the tile is freed
    this.clearPositionCache();
    this.state = QuadtreeTileLoadState.START;
    this.renderable = false;
    this.upsampledFromParent = false;

    const data = /** @type {*} */ (this.data);
    if (defined(data) && defined(data.freeResources)) {
      data.freeResources();
    }

    freeTile(this._southwestChild);
    this._southwestChild = undefined;
    freeTile(this._southeastChild);
    this._southeastChild = undefined;
    freeTile(this._northwestChild);
    this._northwestChild = undefined;
    freeTile(this._northeastChild);
    this._northeastChild = undefined;
  }
}

/**
 * Creates a spatial hash key for the given longitude, latitude, and tile level.
 * The precision is adjusted based on the tile level and extent to achieve finer precision at higher levels.
 *
 * This function calculates the spatial hash key by first determining the precision at the given tile for the current maximum screenspace error (MAX_ERROR_PX),
 * and then rounding the longitude and latitude to that precision for consistency.
 *
 * The steps for computing the level precision are as follows:
 *
 * 1. Compute the resolution (meters per pixel) at the given level:
 *      level_resolution_m = (2 * PI * RADIUS) / (2^level * TILE_SIZE)
 *
 * 2. Compute the target precision in meters:
 *      level_precision_m = level_resolution_m * MAX_ERROR_PX
 *
 * 3. Compute the target precision to radians:
 *      level_precision_rad = level_precision_m / BODY_RADIUS
 *
 * This simplifies to:
 *      level_precision_rad = (2 * PI * MAX_ERROR_PX) / (2^level * TILE_SIZE)
 * which can also be written as:
 *      level_precision_rad = (PI * MAX_ERROR_PX) / (2^(level-1) * TILE_SIZE)
 *
 * The computed level_precision_rad is then used to round the input longitude and latitude,
 * ensuring that positions that fall within the same spatial bin produce the same hash key.
 *
 * The constants below are computed once since they are fixed for the given configuration.
 *
 * @param {number} longitude - The longitude in radians.
 * @param {number} latitude - The latitude in radians.
 * @param {Rectangle} rectangle - The quadtree tile extents.
 * @returns {string} A string representing the spatial hash key.
 */
const TILE_SIZE = 256;

/**
 * @param {number} longitude
 * @param {number} latitude
 * @param {Rectangle} rectangle
 * @param {number} maximumScreenSpaceError
 * @returns {string}
 * @ignore
 */
function createSpatialHashKey(
  longitude,
  latitude,
  rectangle,
  maximumScreenSpaceError,
) {
  // Adjust precision based on quadtree level - higher levels get finer precision
  const maxError = (rectangle.width / TILE_SIZE) * maximumScreenSpaceError;
  // Round to the grid precision
  const lonGrid = Math.floor(longitude / maxError) * maxError;
  const latGrid = Math.floor(latitude / maxError) * maxError;
  return `${lonGrid.toFixed(10)},${latGrid.toFixed(10)}`;
}

const splitPointScratch = new Cartographic();

/**
 * Determines which child tile that contains the specified position. Assumes the position is within
 * the bounds of the parent tile.
 * @private
 * @param {QuadtreeTile} tile - The parent tile.
 * @param {Cartographic} positionCartographic - The cartographic position.
 * @returns {QuadtreeTile} The child tile that contains the position.
 */
function childTileAtPosition(tile, positionCartographic) {
  // Can't assume that a given tiling scheme divides a parent into four tiles at its rectangle's center.
  // But we can safely take any child tile's rectangle and take its center-facing corner as the parent's split point.
  const nwChildRectangle = tile.northwestChild.rectangle;
  const tileSplitPoint = Rectangle.southeast(
    nwChildRectangle,
    splitPointScratch,
  );

  const x = positionCartographic.longitude >= tileSplitPoint.longitude ? 1 : 0;
  const y = positionCartographic.latitude < tileSplitPoint.latitude ? 1 : 0;

  switch (y * 2 + x) {
    case 0:
      return tile.northwestChild;
    case 1:
      return tile.northeastChild;
    case 2:
      return tile.southwestChild;
    default:
      return tile.southeastChild;
  }
}

/**
 * @param {QuadtreeTile} tile
 * @ignore
 */
function freeTile(tile) {
  if (defined(tile)) {
    tile.freeResources();
  }
}

export default QuadtreeTile;
