import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Rectangle from "../Core/Rectangle.js";
import QuadtreeTileLoadState from "./QuadtreeTileLoadState.js";
import TileSelectionResult from "./TileSelectionResult.js";

/**
 * A single tile in a {@link QuadtreePrimitive}.
 *
 * @alias QuadtreeTile
 * @constructor
 * @private
 *
 * @param {Number} options.level The level of the tile in the quadtree.
 * @param {Number} options.x The X coordinate of the tile in the quadtree.  0 is the westernmost tile.
 * @param {Number} options.y The Y coordinate of the tile in the quadtree.  0 is the northernmost tile.
 * @param {TilingScheme} options.tilingScheme The tiling scheme in which this tile exists.
 * @param {QuadtreeTile} [options.parent] This tile's parent, or undefined if this is a root tile.
 */
function QuadtreeTile(options) {
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
      "options.x and options.y must be greater than or equal to zero."
    );
  }
  if (!defined(options.level)) {
    throw new DeveloperError(
      "options.level is required and must be greater than or equal to zero."
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
  this._rectangle = this._tilingScheme.tileXYToRectangle(
    this._x,
    this._y,
    this._level
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

  this._customData = [];
  this._frameUpdated = undefined;
  this._lastSelectionResult = TileSelectionResult.NONE;
  this._lastSelectionResultFrame = undefined;
  this._loadedCallbacks = {};

  /**
   * Gets or sets the current state of the tile in the tile load pipeline.
   * @type {QuadtreeTileLoadState}
   * @default {@link QuadtreeTileLoadState.START}
   */
  this.state = QuadtreeTileLoadState.START;

  /**
   * Gets or sets a value indicating whether or not the tile is currently renderable.
   * @type {Boolean}
   * @default false
   */
  this.renderable = false;

  /**
   * Gets or set a value indicating whether or not the tile was entirely upsampled from its
   * parent tile.  If all four children of a parent tile were upsampled from the parent,
   * we will render the parent instead of the children even if the LOD indicates that
   * the children would be preferable.
   * @type {Boolean}
   * @default false
   */
  this.upsampledFromParent = false;

  /**
   * Gets or sets the additional data associated with this tile.  The exact content is specific to the
   * {@link QuadtreeTileProvider}.
   * @type {Object}
   * @default undefined
   */
  this.data = undefined;
}

/**
 * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
 *
 * @memberof QuadtreeTile
 *
 * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
 * @returns {QuadtreeTile[]} An array containing the tiles at level of detail zero, starting with the
 * tile in the northwest corner and followed by the tile (if any) to its east.
 */
QuadtreeTile.createLevelZeroTiles = function (tilingScheme) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(tilingScheme)) {
    throw new DeveloperError("tilingScheme is required.");
  }
  //>>includeEnd('debug');

  var numberOfLevelZeroTilesX = tilingScheme.getNumberOfXTilesAtLevel(0);
  var numberOfLevelZeroTilesY = tilingScheme.getNumberOfYTilesAtLevel(0);

  var result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

  var index = 0;
  for (var y = 0; y < numberOfLevelZeroTilesY; ++y) {
    for (var x = 0; x < numberOfLevelZeroTilesX; ++x) {
      result[index++] = new QuadtreeTile({
        tilingScheme: tilingScheme,
        x: x,
        y: y,
        level: 0,
      });
    }
  }

  return result;
};

QuadtreeTile.prototype._updateCustomData = function (
  frameNumber,
  added,
  removed
) {
  var customData = this.customData;

  var i;
  var data;
  var rectangle;

  if (defined(added) && defined(removed)) {
    customData = customData.filter(function (value) {
      return removed.indexOf(value) === -1;
    });
    this._customData = customData;

    rectangle = this._rectangle;
    for (i = 0; i < added.length; ++i) {
      data = added[i];
      if (Rectangle.contains(rectangle, data.positionCartographic)) {
        customData.push(data);
      }
    }

    this._frameUpdated = frameNumber;
  } else {
    // interior or leaf tile, update from parent
    var parent = this._parent;
    if (defined(parent) && this._frameUpdated !== parent._frameUpdated) {
      customData.length = 0;

      rectangle = this._rectangle;
      var parentCustomData = parent.customData;
      for (i = 0; i < parentCustomData.length; ++i) {
        data = parentCustomData[i];
        if (Rectangle.contains(rectangle, data.positionCartographic)) {
          customData.push(data);
        }
      }

      this._frameUpdated = parent._frameUpdated;
    }
  }
};

Object.defineProperties(QuadtreeTile.prototype, {
  /**
   * Gets the tiling scheme used to tile the surface.
   * @memberof QuadtreeTile.prototype
   * @type {TilingScheme}
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the tile X coordinate.
   * @memberof QuadtreeTile.prototype
   * @type {Number}
   */
  x: {
    get: function () {
      return this._x;
    },
  },

  /**
   * Gets the tile Y coordinate.
   * @memberof QuadtreeTile.prototype
   * @type {Number}
   */
  y: {
    get: function () {
      return this._y;
    },
  },

  /**
   * Gets the level-of-detail, where zero is the coarsest, least-detailed.
   * @memberof QuadtreeTile.prototype
   * @type {Number}
   */
  level: {
    get: function () {
      return this._level;
    },
  },

  /**
   * Gets the parent tile of this tile.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile}
   */
  parent: {
    get: function () {
      return this._parent;
    },
  },

  /**
   * Gets the cartographic rectangle of the tile, with north, south, east and
   * west properties in radians.
   * @memberof QuadtreeTile.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },

  /**
   * An array of tiles that is at the next level of the tile tree.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile[]}
   */
  children: {
    get: function () {
      return [
        this.northwestChild,
        this.northeastChild,
        this.southwestChild,
        this.southeastChild,
      ];
    },
  },

  /**
   * Gets the southwest child tile.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile}
   */
  southwestChild: {
    get: function () {
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
    },
  },

  /**
   * Gets the southeast child tile.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile}
   */
  southeastChild: {
    get: function () {
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
    },
  },

  /**
   * Gets the northwest child tile.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile}
   */
  northwestChild: {
    get: function () {
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
    },
  },

  /**
   * Gets the northeast child tile.
   * @memberof QuadtreeTile.prototype
   * @type {QuadtreeTile}
   */
  northeastChild: {
    get: function () {
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
    },
  },

  /**
   * An array of objects associated with this tile.
   * @memberof QuadtreeTile.prototype
   * @type {Array}
   */
  customData: {
    get: function () {
      return this._customData;
    },
  },

  /**
   * Gets a value indicating whether or not this tile needs further loading.
   * This property will return true if the {@link QuadtreeTile#state} is
   * <code>START</code> or <code>LOADING</code>.
   * @memberof QuadtreeTile.prototype
   * @type {Boolean}
   */
  needsLoading: {
    get: function () {
      return this.state < QuadtreeTileLoadState.DONE;
    },
  },

  /**
   * Gets a value indicating whether or not this tile is eligible to be unloaded.
   * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
   * such as a request for data, is in progress on it.  A tile will never be
   * unloaded while it is needed for rendering, regardless of the value of this
   * property.  If {@link QuadtreeTile#data} is defined and has an
   * <code>eligibleForUnloading</code> property, the value of that property is returned.
   * Otherwise, this property returns true.
   * @memberof QuadtreeTile.prototype
   * @type {Boolean}
   */
  eligibleForUnloading: {
    get: function () {
      var result = true;

      if (defined(this.data)) {
        result = this.data.eligibleForUnloading;
        if (!defined(result)) {
          result = true;
        }
      }

      return result;
    },
  },
});

QuadtreeTile.prototype.findLevelZeroTile = function (levelZeroTiles, x, y) {
  var xTiles = this.tilingScheme.getNumberOfXTilesAtLevel(0);
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
};

QuadtreeTile.prototype.findTileToWest = function (levelZeroTiles) {
  var parent = this.parent;
  if (parent === undefined) {
    return this.findLevelZeroTile(levelZeroTiles, this.x - 1, this.y);
  }

  if (parent.southeastChild === this) {
    return parent.southwestChild;
  } else if (parent.northeastChild === this) {
    return parent.northwestChild;
  }

  var westOfParent = parent.findTileToWest(levelZeroTiles);
  if (westOfParent === undefined) {
    return undefined;
  } else if (parent.southwestChild === this) {
    return westOfParent.southeastChild;
  }
  return westOfParent.northeastChild;
};

QuadtreeTile.prototype.findTileToEast = function (levelZeroTiles) {
  var parent = this.parent;
  if (parent === undefined) {
    return this.findLevelZeroTile(levelZeroTiles, this.x + 1, this.y);
  }

  if (parent.southwestChild === this) {
    return parent.southeastChild;
  } else if (parent.northwestChild === this) {
    return parent.northeastChild;
  }

  var eastOfParent = parent.findTileToEast(levelZeroTiles);
  if (eastOfParent === undefined) {
    return undefined;
  } else if (parent.southeastChild === this) {
    return eastOfParent.southwestChild;
  }
  return eastOfParent.northwestChild;
};

QuadtreeTile.prototype.findTileToSouth = function (levelZeroTiles) {
  var parent = this.parent;
  if (parent === undefined) {
    return this.findLevelZeroTile(levelZeroTiles, this.x, this.y + 1);
  }

  if (parent.northwestChild === this) {
    return parent.southwestChild;
  } else if (parent.northeastChild === this) {
    return parent.southeastChild;
  }

  var southOfParent = parent.findTileToSouth(levelZeroTiles);
  if (southOfParent === undefined) {
    return undefined;
  } else if (parent.southwestChild === this) {
    return southOfParent.northwestChild;
  }
  return southOfParent.northeastChild;
};

QuadtreeTile.prototype.findTileToNorth = function (levelZeroTiles) {
  var parent = this.parent;
  if (parent === undefined) {
    return this.findLevelZeroTile(levelZeroTiles, this.x, this.y - 1);
  }

  if (parent.southwestChild === this) {
    return parent.northwestChild;
  } else if (parent.southeastChild === this) {
    return parent.northeastChild;
  }

  var northOfParent = parent.findTileToNorth(levelZeroTiles);
  if (northOfParent === undefined) {
    return undefined;
  } else if (parent.northwestChild === this) {
    return northOfParent.southwestChild;
  }
  return northOfParent.southeastChild;
};

/**
 * Frees the resources associated with this tile and returns it to the <code>START</code>
 * {@link QuadtreeTileLoadState}.  If the {@link QuadtreeTile#data} property is defined and it
 * has a <code>freeResources</code> method, the method will be invoked.
 *
 * @memberof QuadtreeTile
 */
QuadtreeTile.prototype.freeResources = function () {
  this.state = QuadtreeTileLoadState.START;
  this.renderable = false;
  this.upsampledFromParent = false;

  if (defined(this.data) && defined(this.data.freeResources)) {
    this.data.freeResources();
  }

  freeTile(this._southwestChild);
  this._southwestChild = undefined;
  freeTile(this._southeastChild);
  this._southeastChild = undefined;
  freeTile(this._northwestChild);
  this._northwestChild = undefined;
  freeTile(this._northeastChild);
  this._northeastChild = undefined;
};

function freeTile(tile) {
  if (defined(tile)) {
    tile.freeResources();
  }
}
export default QuadtreeTile;
