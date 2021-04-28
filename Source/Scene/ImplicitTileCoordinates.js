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
 * @param {Number} options.level The level of a tile relative to the tile with the extension.
 * @param {Number} options.x The x coordinate of the tile
 * @param {Number} options.y The y coordinate of the tile
 * @param {Number} [options.z] The z coordinate of the tile. Only required when options.subdivisionScheme is ImplicitSubdivisionScheme.OCTREE
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitTileCoordinates(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.subdivisionScheme", options.subdivisionScheme);
  Check.typeOf.number("options.level", options.level);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    Check.typeOf.number("options.z", options.z);
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
   * @type {Number}
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
   * Get the Morton index for this tile within the current LOD by interleaving
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
      level: level,
      x: x,
      y: y,
      z: z,
    });
  }

  // Quadtree
  return new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    level: level,
    x: x,
    y: y,
  });
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
 * @param {Number} level The level of the tree
 * @param {Number} mortonIndex The morton index of the tile.
 * @returns {ImplicitTileCoordinates} The coordinates of the tile with the given Morton index
 * @private
 */
ImplicitTileCoordinates.fromMortonIndex = function (
  subdivisionScheme,
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
      level: level,
      x: coordinatesArray[0],
      y: coordinatesArray[1],
      z: coordinatesArray[2],
    });
  }

  coordinatesArray = MortonOrder.decode2D(mortonIndex, scratchCoordinatesArray);
  return new ImplicitTileCoordinates({
    subdivisionScheme: subdivisionScheme,
    level: level,
    x: coordinatesArray[0],
    y: coordinatesArray[1],
  });
};
