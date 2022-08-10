import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import MortonOrder from "../Core/MortonOrder.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

/**
 * The coordinates for a tile in an implicit tileset. The coordinates
 * are (level, x, y) for quadtrees or (level, x, y, z) for octrees.
 * <p>
 * Level numbers are 0-indexed and typically start at the root of the implicit
 * tileset (the tile with either implicitTiling in its JSON (3D Tiles 1.1) or
 * the <code>3DTILES_implicit_tiling</code> extension).
 * This object can also represent the relative offset from one set of coordinates
 * to another. See {@link ImplicitTileCoordinates#getOffsetCoordinates}. The term
 * local coordinates refers to coordinates that are relative to the root of a
 * subtree and the term global coordinates refers to coordinates relative to the
 * root of an implicit tileset.
 * </p>
 * <p>
 * For box bounding volumes, x, y, z increase along the +x, +y, and +z
 * directions defined by the half axes.
 * </p>
 * <p>
 * For region bounding volumes, x increases in the +longitude direction, y
 * increases in the +latitude direction, and z increases in the +height
 * direction.
 * </p>
 * <p>
 * Care must be taken when converting between implicit coordinates and Morton
 * indices because there is a 16-bit limit on {@link MortonOrder#encode2D} and
 * a 10-bit limit on {@link MortonOrder#encode3D}. Typically these conversions
 * should be done on local coordinates, not global coordinates, and the maximum
 * number of levels in the subtree should be 15 for quadtree and 9 for octree (to
 * account for the extra level needed by child subtree coordinates).
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
function ImplicitTileCoordinates(options) {
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
  const dimensionAtLevel = 1 << options.level;
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
   * Level of this tile, relative to the tile with implicit tiling in its JSON
   * (3D Tiles 1.1) or the <code>3DTILES_implicit_tiling</code> extension.
   * Level numbers start at 0.
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
      let childIndex = 0;
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

  /**
   * Get the tile index by adding the Morton index to the level offset
   *
   * @type {Number}
   * @readonly
   * @private
   */
  tileIndex: {
    get: function () {
      const levelOffset =
        this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE
          ? // (8^N - 1) / (8-1)
            ((1 << (3 * this.level)) - 1) / 7
          : // (4^N - 1) / (4-1)
            ((1 << (2 * this.level)) - 1) / 3;

      const mortonIndex = this.mortonIndex;
      return levelOffset + mortonIndex;
    },
  },
});

/**
 * Check that the two coordinates are compatible
 * @param {ImplicitTileCoordinates} a
 * @param {ImplicitTileCoordinates} b
 * @private
 */
function checkMatchingSubtreeShape(a, b) {
  if (a.subdivisionScheme !== b.subdivisionScheme) {
    throw new DeveloperError("coordinates must have same subdivisionScheme");
  }
  if (a.subtreeLevels !== b.subtreeLevels) {
    throw new DeveloperError("coordinates must have same subtreeLevels");
  }
}

/**
 * Compute the coordinates of a tile deeper in the tree with a (level, x, y, [z]) relative offset.
 *
 * @param {ImplicitTileCoordinates} offsetCoordinates The offset from the ancestor
 * @returns {ImplicitTileCoordinates} The coordinates of the descendant
 * @private
 */
ImplicitTileCoordinates.prototype.getDescendantCoordinates = function (
  offsetCoordinates
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("offsetCoordinates", offsetCoordinates);
  checkMatchingSubtreeShape(this, offsetCoordinates);
  //>>includeEnd('debug');

  const descendantLevel = this.level + offsetCoordinates.level;
  const descendantX = (this.x << offsetCoordinates.level) + offsetCoordinates.x;
  const descendantY = (this.y << offsetCoordinates.level) + offsetCoordinates.y;

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    const descendantZ =
      (this.z << offsetCoordinates.level) + offsetCoordinates.z;

    return new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
      subtreeLevels: this.subtreeLevels,
      level: descendantLevel,
      x: descendantX,
      y: descendantY,
      z: descendantZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    subtreeLevels: this.subtreeLevels,
    level: descendantLevel,
    x: descendantX,
    y: descendantY,
  });
};

/**
 * Compute the coordinates of a tile higher up in the tree by going up a number of levels.
 *
 * @param {Number} offsetLevels The number of levels to go up in the tree
 * @returns {ImplicitTileCoordinates} The coordinates of the ancestor
 * @private
 */
ImplicitTileCoordinates.prototype.getAncestorCoordinates = function (
  offsetLevels
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("offsetLevels", offsetLevels);
  if (offsetLevels < 0) {
    throw new DeveloperError("offsetLevels must be non-negative");
  }
  if (offsetLevels > this.level) {
    throw new DeveloperError("ancestor cannot be above the tileset root");
  }
  //>>includeEnd('debug');

  const divisor = 1 << offsetLevels;
  const ancestorLevel = this.level - offsetLevels;
  const ancestorX = Math.floor(this.x / divisor);
  const ancestorY = Math.floor(this.y / divisor);

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    const ancestorZ = Math.floor(this.z / divisor);

    return new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
      subtreeLevels: this.subtreeLevels,
      level: ancestorLevel,
      x: ancestorX,
      y: ancestorY,
      z: ancestorZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    subtreeLevels: this.subtreeLevels,
    level: ancestorLevel,
    x: ancestorX,
    y: ancestorY,
  });
};

/**
 * Compute the (level, x, y, [z]) offset to a descendant
 *
 * @param {ImplicitTileCoordinates} descendantCoordinates The descendant coordinates
 * @returns {ImplicitTileCoordinates} The offset between the ancestor and the descendant
 */
ImplicitTileCoordinates.prototype.getOffsetCoordinates = function (
  descendantCoordinates
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("descendantCoordinates", descendantCoordinates);
  if (
    !this.isEqual(descendantCoordinates) &&
    !this.isAncestor(descendantCoordinates)
  ) {
    throw new DeveloperError("this is not an ancestor of descendant");
  }
  checkMatchingSubtreeShape(this, descendantCoordinates);
  //>>includeEnd('debug');

  const offsetLevel = descendantCoordinates.level - this.level;
  const dimensionAtOffsetLevel = 1 << offsetLevel;

  const offsetX = descendantCoordinates.x % dimensionAtOffsetLevel;
  const offsetY = descendantCoordinates.y % dimensionAtOffsetLevel;

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    const offsetZ = descendantCoordinates.z % dimensionAtOffsetLevel;

    return new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
      subtreeLevels: this.subtreeLevels,
      level: offsetLevel,
      x: offsetX,
      y: offsetY,
      z: offsetZ,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    subtreeLevels: this.subtreeLevels,
    level: offsetLevel,
    x: offsetX,
    y: offsetY,
  });
};

/**
 * Given the morton index of the child, compute the coordinates of the child.
 * This is a special case of {@link ImplicitTileCoordinates#getDescendantCoordinates}.
 *
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @returns {ImplicitTileCoordinates} The tile coordinates of the child
 * @private
 */
ImplicitTileCoordinates.prototype.getChildCoordinates = function (childIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("childIndex", childIndex);
  const branchingFactor = ImplicitSubdivisionScheme.getBranchingFactor(
    this.subdivisionScheme
  );
  if (childIndex < 0 || branchingFactor <= childIndex) {
    throw new DeveloperError(
      `childIndex must be at least 0 and less than ${branchingFactor}`
    );
  }
  //>>includeEnd('debug');

  const level = this.level + 1;
  const x = 2 * this.x + (childIndex % 2);
  const y = 2 * this.y + (Math.floor(childIndex / 2) % 2);

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    const z = 2 * this.z + (Math.floor(childIndex / 4) % 2);
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
 * Get the coordinates of the subtree that contains this tile. If the tile is
 * the root of the subtree, the root of the subtree is returned.
 *
 * @returns {ImplicitTileCoordinates} The subtree that contains this tile
 * @private
 */
ImplicitTileCoordinates.prototype.getSubtreeCoordinates = function () {
  return this.getAncestorCoordinates(this.level % this.subtreeLevels);
};

/**
 * Get the coordinates of the parent subtree that contains this tile
 *
 * @returns {ImplicitTileCoordinates} The parent subtree that contains this tile
 * @private
 */
ImplicitTileCoordinates.prototype.getParentSubtreeCoordinates = function () {
  return this.getAncestorCoordinates(
    (this.level % this.subtreeLevels) + this.subtreeLevels
  );
};

/**
 * Returns whether this tile is an ancestor of another tile
 *
 * @param {ImplicitTileCoordinates} descendantCoordinates the descendant coordinates
 * @returns {Boolean} <code>true</code> if this tile is an ancestor of the other tile
 * @private
 */
ImplicitTileCoordinates.prototype.isAncestor = function (
  descendantCoordinates
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("descendantCoordinates", descendantCoordinates);
  checkMatchingSubtreeShape(this, descendantCoordinates);
  //>>includeEnd('debug');

  const levelDifference = descendantCoordinates.level - this.level;
  if (levelDifference <= 0) {
    return false;
  }

  const ancestorX = descendantCoordinates.x >> levelDifference;
  const ancestorY = descendantCoordinates.y >> levelDifference;
  const isAncestorX = this.x === ancestorX;
  const isAncestorY = this.y === ancestorY;

  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    const ancestorZ = descendantCoordinates.z >> levelDifference;
    const isAncestorZ = this.z === ancestorZ;
    return isAncestorX && isAncestorY && isAncestorZ;
  }

  // Quadtree
  return isAncestorX && isAncestorY;
};

/**
 * Returns whether the provided coordinates are equal to this coordinate
 *
 * @param {ImplicitTileCoordinates} otherCoordinates the other coordinates
 * @returns {Boolean} <code>true</code> if the coordinates are equal
 * @private
 */
ImplicitTileCoordinates.prototype.isEqual = function (otherCoordinates) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("otherCoordinates", otherCoordinates);
  //>>includeEnd('debug');

  return (
    this.subdivisionScheme === otherCoordinates.subdivisionScheme &&
    this.subtreeLevels === otherCoordinates.subtreeLevels &&
    this.level === otherCoordinates.level &&
    this.x === otherCoordinates.x &&
    this.y === otherCoordinates.y &&
    (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE
      ? this.z === otherCoordinates.z
      : true)
  );
};

/**
 * Returns whether this tile is the root of the implicit tileset
 *
 * @returns {Boolean} <code>true</code> if this tile is the root
 * @private
 */
ImplicitTileCoordinates.prototype.isImplicitTilesetRoot = function () {
  return this.level === 0;
};

/**
 * Returns whether this tile is the root of the subtree
 *
 * @returns {Boolean} <code>true</code> if this tile is the root of the subtree
 * @private
 */
ImplicitTileCoordinates.prototype.isSubtreeRoot = function () {
  return this.level % this.subtreeLevels === 0;
};

/**
 * Returns whether this tile is on the last row of tiles in the subtree
 *
 * @returns {Boolean} <code>true</code> if this tile is on the last row of tiles in the subtree
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
  const values = {
    level: this.level,
    x: this.x,
    y: this.y,
  };
  if (this.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    values.z = this.z;
  }

  return values;
};

const scratchCoordinatesArray = [0, 0, 0];

/**
 * Given a level number, morton index, and whether the tileset is an
 * octree/quadtree, compute the (level, x, y, [z]) coordinates
 *
 * @param {ImplicitSubdivisionScheme} subdivisionScheme Whether the coordinates are for a quadtree or octree
 * @param {Number} subtreeLevels The number of distinct levels within the coordinate's subtree
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
  let coordinatesArray;
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

/**
 * Given a tile index and whether the tileset is an octree/quadtree, compute
 * the (level, x, y, [z]) coordinates
 *
 * @param {ImplicitSubdivisionScheme} subdivisionScheme Whether the coordinates are for a quadtree or octree
 * @param {Number} subtreeLevels The number of distinct levels within the coordinate's subtree
 * @param {Number} tileIndex The tile's index
 * @returns {ImplicitTileCoordinates} The coordinates of the tile with the given tile index
 * @private
 */
ImplicitTileCoordinates.fromTileIndex = function (
  subdivisionScheme,
  subtreeLevels,
  tileIndex
) {
  let level;
  let levelOffset;
  let mortonIndex;

  if (subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    // Node count up to octree level: (8^L - 1) / (8-1)
    // (8^L - 1) / (8-1) <= X < (8^(L+1) - 1) / (8-1)
    // 8^L <= (7x + 1) < 8^(L+1)
    // L <= log8(7x + 1) < L + 1
    // L = floor(log8(7x + 1))
    // L = floor(log2(7x + 1) / log2(8))
    // L = floor(log2(7x + 1) / 3)
    level = Math.floor(CesiumMath.log2(7 * tileIndex + 1) / 3);
    levelOffset = ((1 << (3 * level)) - 1) / 7;
    mortonIndex = tileIndex - levelOffset;
  } else {
    // Node count up to quadtree level: (4^L - 1) / (4-1)
    // (4^L - 1) / (4-1) <= X < (4^(L+1) - 1) / (4-1)
    // 4^L <= (3x + 1) < 4^(L+1)
    // L <= log4(3x + 1) < L + 1
    // L = floor(log4(3x + 1))
    // L = floor(log2(3x + 1) / log2(4))
    // L = floor(log2(3x + 1) / 2)
    level = Math.floor(CesiumMath.log2(3 * tileIndex + 1) / 2);
    levelOffset = ((1 << (2 * level)) - 1) / 3;
    mortonIndex = tileIndex - levelOffset;
  }

  return ImplicitTileCoordinates.fromMortonIndex(
    subdivisionScheme,
    subtreeLevels,
    level,
    mortonIndex
  );
};

export default ImplicitTileCoordinates;
