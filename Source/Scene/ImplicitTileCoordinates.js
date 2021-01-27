import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
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
