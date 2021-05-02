import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import MortonOrder from "../Core/MortonOrder.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

/**
 * The coordinates for a tile in an implicit tileset. The coordinates
 * are (level, x, y) for quadtrees or (level, x, y, z) for quadtrees.
 * <p>
 * Level numbers are 0-indexed and start at the root of the implicit tileset
 * (the tile with the <code>3DTILES_implicit_tiling</code> extension).
 * </p>
 * <p>
 * For box bounding volumes, x, y, z increase along the +x, +y, and +z
 * directions defined by the half axes
 * </p>
 * <p>
 * For region bounding volumes, x increases in the +longitude direction, y
 * increases in the +latitude direction, and z increases in the +height
 * direction
 * </p>
 *
 * @alias ImplicitTileCoordinates
 * @constructor
 *
 * @param {Object} options An object with the following properties:
 * @param {ImplicitSubdivisionScheme} options.subdivisionScheme Whether the coordinates are for a quadtree or octree
 * @param {Number} options.subtreeLevels The number of distinct levels within the coordinate's subtree
 * @param {Number} options.level The level of a tile relative to the tile with the extension
 * @param {Number} options.x The x coordinate of the tile
 * @param {Number} options.y The y coordinate of the tile
 * @param {Number} [options.z] The z coordinate of the tile. Only required when options.subdivisionScheme is ImplicitSubdivisionScheme.OCTREE
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitTileCoordinates(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.subdivisionScheme", options.subdivisionScheme);
  Check.typeOf.number("options.subtreeLevels", options.subtreeLevels);
  Check.typeOf.number("options.level", options.level);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    Check.typeOf.number("options.z", options.z);
  }
  // Check for values that are negative
  if (options.level < 0) {
    throw new DeveloperError("level must be non-negative");
  }
  if (options.x < 0) {
    throw new DeveloperError("x must be non-negative");
  }
  if (options.y < 0) {
    throw new DeveloperError("y must be non-negative");
  }
  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    if (options.z < 0) {
      throw new DeveloperError("z must be non-negative");
    }
  }

  // Check for values that are too large
  var dimensionAtLevel = 1 << options.level;
  if (options.x >= dimensionAtLevel) {
    throw new DeveloperError("x is out of range");
  }
  if (options.y >= dimensionAtLevel) {
    throw new DeveloperError("y is out of range");
  }
  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    if (options.z >= dimensionAtLevel) {
      throw new DeveloperError("z is out of range");
    }
  }
  //>>includeEnd('debug');

  /**
   * Whether the tileset is a quadtree or octree
   *
   * @type {ImplicitSubdivisionScheme}
   * @readonly
   * @private
   */
  this.subdivisionScheme = options.subdivisionScheme;

  /**
   * The number of distinct levels within the coordinate's subtree
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.subtreeLevels = options.subtreeLevels;

  /**
   * Level of this tile, relative to the tile with the
   * <code>3DTILES_implicit_tiling</code> extension. Level numbers start at 0.
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.level = options.level;

  /**
   * X coordinate of this tile
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.x = options.x;

  /**
   * Y coordinate of this tile
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.y = options.y;

  /**
   * Z coordinate of this tile. Only defined for octrees.
   *
   * @type {Number|undefined}
   * @readonly
   * @private
   */
  this.z = undefined;
  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    this.z = options.z;
  }
}

Object.defineProperties(ImplicitTileCoordinates.prototype, {
  /**
   * An index in the range of [0, branchingFactor) that indicates
   * which child of the parent cell these coordinates correspond to.
   * This can be viewed as a morton index within the parent tile.
   * <p>
   * This is the last 3 bits of the morton index of the tile, but it can
   * be computed more directly by concatenating the bits [z0] y0 x0
   * </p>
   *
   * @type {Number}
   * @readonly
   * @private
   */
  childIndex: {
    get: function () {
      var childIndex = 0;
      childIndex |= this.x & 1;
      childIndex |= (this.y & 1) << 1;
      if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
        childIndex |= (this.z & 1) << 2;
      }

      return childIndex;
    },
  },

  /**
   * Get the Morton index for this tile within the current level by interleaving
   * the bits of the x, y and z coordinates.
   *
   * @type {Number}
   * @readonly
   * @private
   */
  mortonIndex: {
    get: function () {
      if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
        return MortonOrder.encode3D(this.x, this.y, this.z);
      }
      return MortonOrder.encode2D(this.x, this.y);
    },
  },
});

/**
 * Given the (level, x, y, [z]) coordinates of the parent, compute the
 * coordinates of the child.
 *
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @returns {ImplicitTileCoordinates} The tile coordinates of the child
 * @private
 */
ImplicitTileCoordinates.prototype.deriveChildCoordinates = function (
  childIndex
) {
  //>>includeStart('debug', pragmas.debug);
  var branchingFactor = ImplicitSubdivisionScheme.getBranchingFactor(
    this.subdivisionScheme
  );
  if (childIndex < 0 || branchingFactor <= childIndex) {
    throw new DeveloperError(
      "childIndex must be at least 0 and less than " + branchingFactor
    );
  }
  //>>includeEnd('debug');

  var level = this.level + 1;
  var x = 2 * this.x + (childIndex % 2);
  var y = 2 * this.y + (Math.floor(childIndex / 2) % 2);

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var z = 2 * this.z + (Math.floor(childIndex / 4) % 2);
    return new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
      subtreeLevels: this.subtreeLevels,
      level: level,
      x: x,
      y: y,
      z: z,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    subtreeLevels: this.subtreeLevels,
    level: level,
    x: x,
    y: y,
  });
};

/**
 * Given the (level, x, y, [z]) coordinates of the parent and
 * a (level, x, y, [z]) relative offset, compute the coordinates of the descendant.
 *
 * @param {ImplicitTileCoordinates} localCoordinates The local coordinates of the descendant
 * @returns {ImplicitTileCoordinates} The tile coordinates of the descendant
 * @private
 */
ImplicitTileCoordinates.prototype.deriveDescendantCoordinates = function (
  localCoordinates
) {
  var subdivisionScheme = this.subdivisionScheme;
  var subtreeLevels = this.subtreeLevels;
  var tileLevel = this.level;
  var tileX = this.x;
  var tileY = this.y;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("localCoordinates", localCoordinates);
  if (subdivisionScheme !== localCoordinates.subdivisionScheme) {
    throw new DeveloperError("coordinates must have same subdivisionScheme");
  }

  if (subtreeLevels !== localCoordinates.subtreeLevels) {
    throw new DeveloperError("coordinates must have same subtreeLevels");
  }
  //>>includeEnd('debug');

  var globalLevel = tileLevel + localCoordinates.level;
  var globalX = (tileX << localCoordinates.level) + localCoordinates.x;
  var globalY = (tileY << localCoordinates.level) + localCoordinates.y;

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var tileZ = this.z;
    var globalZ = (tileZ << localCoordinates.level) + localCoordinates.z;

    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: globalLevel,
      x: globalX,
      y: globalY,
      z: globalZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: globalLevel,
    x: globalX,
    y: globalY,
  });
};

/**
 * Get the coordinates of the subtree that contains this tile
 *
 * @returns {ImplicitTileCoordinates} The subtree that contains this tile
 * @private
 */
ImplicitTileCoordinates.prototype.deriveSubtreeCoordinates = function () {
  var subdivisionScheme = this.subdivisionScheme;
  var subtreeLevels = this.subtreeLevels;
  var tileLevel = this.level;
  var tileX = this.x;
  var tileY = this.y;

  var subtreeLevel = ((tileLevel / subtreeLevels) | 0) * subtreeLevels;
  var divisor = 1 << (tileLevel - subtreeLevel);
  var subtreeX = (tileX / divisor) | 0;
  var subtreeY = (tileY / divisor) | 0;

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var tileZ = this.z;
    var subtreeZ = (tileZ / divisor) | 0;

    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: subtreeLevel,
      x: subtreeX,
      y: subtreeY,
      z: subtreeZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: subtreeLevel,
    x: subtreeX,
    y: subtreeY,
  });
};

/**
 * Get the coordinates of the parent subtree that contains this tile
 *
 * @returns {ImplicitTileCoordinates} The parent subtree that contains this tile
 * @private
 */
ImplicitTileCoordinates.prototype.deriveParentSubtreeCoordinates = function () {
  var subtreeCoordinates = this.deriveSubtreeCoordinates();
  if (subtreeCoordinates.isRoot()) {
    // This subtree is the root of the entire tileset, so it can't go up any higher.
    return subtreeCoordinates;
  }

  var subdivisionScheme = subtreeCoordinates.subdivisionScheme;
  var subtreeLevels = subtreeCoordinates.subtreeLevels;
  var subtreeLevel = subtreeCoordinates.level;
  var subtreeX = subtreeCoordinates.x;
  var subtreeY = subtreeCoordinates.y;

  var parentSubtreeLevel = subtreeLevel - subtreeLevels;
  var parentSubtreeX = subtreeX >> subtreeLevels;
  var parentSubtreeY = subtreeY >> subtreeLevels;

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var subtreeZ = subtreeCoordinates.z;
    var parentSubtreeZ = subtreeZ >> subtreeLevels;

    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: parentSubtreeLevel,
      x: parentSubtreeX,
      y: parentSubtreeY,
      z: parentSubtreeZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: parentSubtreeLevel,
    x: parentSubtreeX,
    y: parentSubtreeY,
  });
};

/**
 * Get the local coordinates of the tile relative to its subtree
 *
 * @returns {ImplicitTileCoordinates} The local coordinates of the tile
 * @private
 */
ImplicitTileCoordinates.prototype.deriveLocalTileCoordinates = function () {
  var subdivisionScheme = this.subdivisionScheme;
  var subtreeLevels = this.subtreeLevels;
  var tileX = this.x;
  var tileY = this.y;
  var tileLevel = this.level;

  var subtreeCoordinates = this.deriveSubtreeCoordinates();
  var localLevel = tileLevel - subtreeCoordinates.level;

  var localX = tileX % (1 << localLevel);
  var localY = tileY % (1 << localLevel);

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var tileZ = this.z;
    var localZ = tileZ % (1 << localLevel);

    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: localLevel,
      x: localX,
      y: localY,
      z: localZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: localLevel,
    x: localX,
    y: localY,
  });
};

/**
 * Get the local coordinates of the child subtree relative to its subtree
 *
 * @returns {ImplicitTileCoordinates} The local coordinates of the child subtree
 * @private
 */
ImplicitTileCoordinates.prototype.deriveLocalChildSubtreeCoordinates = function () {
  //>>includeStart('debug', pragmas.debug);
  if (!this.isRootOfSubtree() || this.isRoot()) {
    throw new DeveloperError(
      "child subtree must be the root of a non-root subtree"
    );
  }
  //>>includeEnd('debug');

  var subdivisionScheme = this.subdivisionScheme;
  var subtreeLevels = this.subtreeLevels;
  var tileX = this.x;
  var tileY = this.y;

  var localX = tileX % (1 << subtreeLevels);
  var localY = tileY % (1 << subtreeLevels);

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var tileZ = this.z;
    var localZ = tileZ % (1 << subtreeLevels);

    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: subtreeLevels,
      x: localX,
      y: localY,
      z: localZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: subtreeLevels,
    x: localX,
    y: localY,
  });
};

/**
 * Returns whether this tile is an ancestor of another tile
 *
 * @param {ImplicitTileCoordinates} otherCoordinates the other tile coordinates
 * @returns {Boolean} <code>true</code> if this tile is an ancestor of the other tile
 * @private
 */
ImplicitTileCoordinates.prototype.isAncestorOf = function (otherCoordinates) {
  var subdivisionScheme = this.subdivisionScheme;
  var subtreeLevels = this.subtreeLevels;
  var tileLevel = this.level;
  var tileX = this.x;
  var tileY = this.y;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("otherCoordinates", otherCoordinates);
  if (subdivisionScheme !== otherCoordinates.subdivisionScheme) {
    throw new DeveloperError("coordinates must have same subdivisionScheme");
  }

  if (subtreeLevels !== otherCoordinates.subtreeLevels) {
    throw new DeveloperError("coordinates must have same subtreeLevels");
  }
  //>>includeEnd('debug');

  var levelDifference = otherCoordinates.level - tileLevel;
  if (levelDifference <= 0) {
    return false;
  }

  var isAncestorX = tileX === otherCoordinates.x >> levelDifference;
  var isAncestorY = tileY === otherCoordinates.y >> levelDifference;

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var tileZ = this.z;
    var isAncestorZ = tileZ === otherCoordinates.z >> levelDifference;

    return isAncestorX && isAncestorY && isAncestorZ;
  }

  // Quadtree
  return isAncestorX && isAncestorY;
};

/**
 * Returns whether this tile is the root
 *
 * @returns {Boolean} <code>true</code> if this tile is the root
 * @private
 */
ImplicitTileCoordinates.prototype.isRoot = function () {
  return this.level === 0;
};

/**
 * Returns whether this tile is the root of the subtree
 *
 * @returns {Boolean} <code>true</code> if this tile is the root of the subtree
 * @private
 */
ImplicitTileCoordinates.prototype.isRootOfSubtree = function () {
  return this.level % this.subtreeLevels === 0;
};

/**
 * Returns whether this tile is at the bottom of the subtree
 *
 * @returns {Boolean} <code>true</code> if this tile is at the bottom of the subtree
 * @private
 */
ImplicitTileCoordinates.prototype.isBottomOfSubtree = function () {
  return this.level % this.subtreeLevels === this.subtreeLevels - 1;
};

/**
 * Get a dictionary of values for templating into an implicit template URI.
 *
 * @returns {Object} An object suitable for use with {@link Resource#getDerivedResource}
 * @private
 */
ImplicitTileCoordinates.prototype.getTemplateValues = function () {
  var values = {
    level: this.level,
    x: this.x,
    y: this.y,
  };
  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    values.z = this.z;
  }

  return values;
};

var scratchCoordinatesArray = [0, 0, 0];
/**
 * Given a level number, morton index, and whether the tileset is an
 * octree/quadtree, compute the (level, x, y, [z]) coordinates
 *
 * @param {ImplicitSubdivisionScheme} subdivisionScheme
 * @param {Number} subtreeLevels
 * @param {Number} level The level of the tree
 * @param {Number} mortonIndex The morton index of the tile.
 * @returns {ImplicitTileCoordinates} The coordinates of the tile with the given Morton index
 * @private
 */
ImplicitTileCoordinates.fromMortonIndex = function (
  subdivisionScheme,
  subtreeLevels,
  level,
  mortonIndex
) {
  var coordinatesArray;
  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    coordinatesArray = MortonOrder.decode3D(
      mortonIndex,
      scratchCoordinatesArray
    );
    return new ImplicitTileCoordinates({
      subdivisionScheme: subdivisionScheme,
      subtreeLevels: subtreeLevels,
      level: level,
      x: coordinatesArray[0],
      y: coordinatesArray[1],
      z: coordinatesArray[2],
    });
  }

  coordinatesArray = MortonOrder.decode2D(mortonIndex, scratchCoordinatesArray);
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    subtreeLevels: subtreeLevels,
    level: level,
    x: coordinatesArray[0],
    y: coordinatesArray[1],
  });
};
