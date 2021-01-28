import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import MortonOrder from "../Core/MortonOrder.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

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

  this.subdivisionScheme = options.subdivisionScheme;
  this.level = options.level;
  this.x = options.x;
  this.y = options.y;

  if (options.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    this.z = options.z;
  }
}

Object.defineProperties(ImplicitTileCoordinates.prototype, {
  /**
   * An index in the range of [0, branchingFactor) that indicates
   * which child of the parent cell these coordinates correspond to.
   *
   * This is the last 3 bits of the morton index of the tile, but it can
   * be computed more directly by concatenating the bits [z0] y0 x0
   * @type {Number}
   * @readonly
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
 * @param {Number} childIndex The index of the child in the parents.children
 * array. This must be in [0, 4) for quadtrees and [0, 8) for octrees.
 * @return {ImplicitTileCoordinates} The tile coordinates of the child
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
      "childIndex must be at least 0 and less than" + branchingFactor
    );
  }
  //>>includeEnd('debug');

  var level = this.level + 1;

  // TODO: This also can be done using bitwise operations. The offsets are the last
  // 2-3 bits
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
  } else {
    // Quadtree
    return new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
      level: level,
      x: x,
      y: y,
    });
  }
};

var scratchCoordinatesArray = [0, 0, 0];
/**
 * Given a level number, morton index, and whether the tileset is an
 * octree/quadtree, compute the (level, x, y, [z]) coordinates
 * @param {ImplicitSubdivisionScheme} subdivisionScheme
 * @param {Number} level The level of the tree
 * @param {Number} mortonIndex The morton index of the tile.
 * @return {ImplicitTileCoordinates} The coordinates of the tile with the given
 * Morton index
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
