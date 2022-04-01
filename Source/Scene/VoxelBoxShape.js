import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

/**
 * A box {@link VoxelShape}.
 *
 * @alias VoxelBoxShape
 * @constructor
 *
 * @see VoxelShape
 * @see VoxelEllipsoidShape
 * @see VoxelCylinderShape
 * @see VoxelShapeType
 *
 * @private
 */
function VoxelBoxShape() {
  /**
   * An oriented bounding box containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {OrientedBoundingBox}
   * @readonly
   */
  this.orientedBoundingBox = new OrientedBoundingBox();

  /**
   * A bounding sphere containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {BoundingSphere}
   * @readonly
   */
  this.boundingSphere = new BoundingSphere();

  /**
   * A transformation matrix containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   * @readonly
   */
  this.boundTransform = new Matrix4();

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   * @readonly
   */
  this.shapeTransform = new Matrix4();

  /**
   * Check if the shape is visible. For example, if the shape has zero scale it will be invisible.
   * The update function must be called before accessing this value.
   * @type {Boolean}
   * @readonly
   */
  this.isVisible = false;

  /**
   * @type {Cartesian3}
   * @private
   */
  this._minBounds = Cartesian3.clone(
    VoxelBoxShape.DefaultMinBounds,
    new Cartesian3()
  );

  /**
   * @type {Cartesian3}
   * @private
   */
  this._maxBounds = Cartesian3.clone(
    VoxelBoxShape.DefaultMaxBounds,
    new Cartesian3()
  );
}

const scratchTranslation = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotation = new Matrix3();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 */
VoxelBoxShape.prototype.update = function (modelMatrix, minBounds, maxBounds) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  // Don't render if any of the min bounds exceed the max bounds.
  // Don't render if two of the min bounds equal the max bounds because it would be an invisible line.
  // Don't render if all of the min bounds equal the max bounds because it would be an invisible point.
  // Still render if one of the min bounds is equal to the max bounds because it will be a square/rectangle.
  if (
    minBounds.x > maxBounds.x ||
    minBounds.y > maxBounds.y ||
    minBounds.z > maxBounds.z ||
    (minBounds.x === maxBounds.x) +
      (minBounds.y === maxBounds.y) +
      (minBounds.z === maxBounds.z) >=
      2
  ) {
    this.isVisible = false;
    return;
  }

  // If two or more of the scales are 0 the shape will not render.
  // If one of the scales is 0 it will still be visible but will appear as a square/rectangle.
  const scale = Matrix4.getScale(modelMatrix, scratchScale);
  if ((scale.x === 0.0) + (scale.y === 0.0) + (scale.z === 0.0) >= 2) {
    this.isVisible = false;
    return;
  }

  this._minBounds = Cartesian3.clone(minBounds, this._minBounds);
  this._maxBounds = Cartesian3.clone(maxBounds, this._maxBounds);

  this.orientedBoundingBox = getBoxChunkObb(
    minBounds.x,
    maxBounds.x,
    minBounds.y,
    maxBounds.y,
    minBounds.z,
    maxBounds.z,
    modelMatrix,
    this.orientedBoundingBox
  );

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  // All of the box bounds go from -1 to +1, so the model matrix scale can be
  // used as the oriented bounding box half axes.
  this.boundTransform = Matrix4.fromRotationTranslation(
    this.orientedBoundingBox.halfAxes,
    this.orientedBoundingBox.center,
    this.boundTransform
  );

  this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this.orientedBoundingBox,
    this.boundingSphere
  );

  this.isVisible = true;
};

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
 *
 * @param {Number} tileLevel The tile's level.
 * @param {Number} tileX The tile's x coordinate.
 * @param {Number} tileY The tile's y coordinate.
 * @param {Number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelBoxShape.prototype.computeOrientedBoundingBoxForTile = function (
  tileLevel,
  tileX,
  tileY,
  tileZ,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("tileLevel", tileLevel);
  Check.typeOf.number("tileX", tileX);
  Check.typeOf.number("tileY", tileY);
  Check.typeOf.number("tileZ", tileZ);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const rootTransform = this.shapeTransform;
  const sizeAtLevel = 1.0 / Math.pow(2, tileLevel);

  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;

  const minimumX = CesiumMath.lerp(
    minBounds.x,
    maxBounds.x,
    sizeAtLevel * tileX
  );
  const minimumY = CesiumMath.lerp(
    minBounds.y,
    maxBounds.y,
    sizeAtLevel * tileY
  );
  const minimumZ = CesiumMath.lerp(
    minBounds.z,
    maxBounds.z,
    sizeAtLevel * tileZ
  );
  const maximumX = CesiumMath.lerp(
    minBounds.x,
    maxBounds.x,
    sizeAtLevel * (tileX + 1)
  );
  const maximumY = CesiumMath.lerp(
    minBounds.y,
    maxBounds.y,
    sizeAtLevel * (tileY + 1)
  );
  const maximumZ = CesiumMath.lerp(
    minBounds.z,
    maxBounds.z,
    sizeAtLevel * (tileZ + 1)
  );

  return getBoxChunkObb(
    minimumX,
    maximumX,
    minimumY,
    maximumY,
    minimumZ,
    maximumZ,
    rootTransform,
    result
  );
};

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 *
 * @param {Cartesian3} voxelDimensions The voxel grid dimensions for a tile.
 * @returns {Number} The step size.
 */
VoxelBoxShape.prototype.computeApproximateStepSize = function (dimensions) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("dimensions", dimensions);
  //>>includeEnd('debug');

  return 1.0 / Cartesian3.maximumComponent(dimensions);
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum X, Y, Z.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMinBounds = new Cartesian3(-1.0, -1.0, -1.0);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum X, Y, Z.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMaxBounds = new Cartesian3(+1.0, +1.0, +1.0);

/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Cartesian3} minimumX The minimumX.
 * @param {Cartesian3} maximumX The maximumX.
 * @param {Cartesian3} minimumY The minimumY.
 * @param {Cartesian3} maximumY The maximumY.
 * @param {Cartesian3} minimumZ The minimumZ.
 * @param {Cartesian3} maximumZ The maximumZ.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getBoxChunkObb(
  minimumX,
  maximumX,
  minimumY,
  maximumY,
  minimumZ,
  maximumZ,
  matrix,
  result
) {
  const defaultMinBounds = VoxelBoxShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelBoxShape.DefaultMaxBounds;

  const isDefaultBounds =
    minimumX === defaultMinBounds.x &&
    minimumY === defaultMinBounds.y &&
    minimumZ === defaultMinBounds.z &&
    maximumX === defaultMaxBounds.x &&
    maximumY === defaultMaxBounds.y &&
    maximumZ === defaultMaxBounds.z;

  if (isDefaultBounds) {
    result.center = Matrix4.getTranslation(matrix, result.center);
    result.halfAxes = Matrix4.getMatrix3(matrix, result.halfAxes);
  } else {
    let scale = Matrix4.getScale(matrix, scratchScale);
    const translation = Matrix4.getTranslation(matrix, scratchTranslation);
    result.center = Cartesian3.fromElements(
      translation.x + scale.x * 0.5 * (minimumX + maximumX),
      translation.y + scale.y * 0.5 * (maximumY + minimumY),
      translation.z + scale.z * 0.5 * (maximumZ + minimumZ),
      result.center
    );

    scale = Cartesian3.fromElements(
      scale.x * 0.5 * (maximumX - minimumX),
      scale.y * 0.5 * (maximumY - minimumY),
      scale.z * 0.5 * (maximumZ - minimumZ),
      scratchScale
    );
    const rotation = Matrix4.getRotation(matrix, scratchRotation);
    result.halfAxes = Matrix3.setScale(rotation, scale, result.halfAxes);
  }

  return result;
}

export default VoxelBoxShape;
