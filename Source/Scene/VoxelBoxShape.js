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

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    boxMinBounds: new Cartesian3(),
    boxMaxBounds: new Cartesian3(),
  };

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    BOX_INTERSECTION_COUNT: 1,
    BOX_BOUNDED: undefined,
    BOX_XY_PLANE: undefined,
    BOX_XZ_PLANE: undefined,
    BOX_YZ_PLANE: undefined,
  };
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
 * @returns {Boolean} Whether the shape is visible.
 */
VoxelBoxShape.prototype.update = function (modelMatrix, minBounds, maxBounds) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const defaultMinBounds = VoxelBoxShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelBoxShape.DefaultMaxBounds;

  minBounds = this._minBounds = Cartesian3.clamp(
    minBounds,
    defaultMinBounds,
    defaultMaxBounds,
    this._minBounds
  );

  maxBounds = this._maxBounds = Cartesian3.clamp(
    maxBounds,
    defaultMinBounds,
    defaultMaxBounds,
    this._maxBounds
  );

  const scale = Matrix4.getScale(modelMatrix, scratchScale);

  // Not visible if:
  // - any of the min bounds exceed the max bounds
  // - two or more of the min bounds equal the max bounds (line and point respectively)
  // - scale is 0 for any component
  if (
    minBounds.x > maxBounds.x ||
    minBounds.y > maxBounds.y ||
    minBounds.z > maxBounds.z ||
    (minBounds.x === maxBounds.x) +
      (minBounds.y === maxBounds.y) +
      (minBounds.z === maxBounds.z) >=
      2 ||
    scale.x === 0.0 ||
    scale.y === 0.0 ||
    scale.z === 0.0
  ) {
    return false;
  }

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  this.orientedBoundingBox = getBoxChunkObb(
    this._minBounds,
    this._maxBounds,
    this.shapeTransform,
    this.orientedBoundingBox
  );

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

  const shaderUniforms = this.shaderUniforms;
  const shaderDefines = this.shaderDefines;

  shaderUniforms.minBounds = Cartesian3.clone(
    minBounds,
    shaderUniforms.minBounds
  );
  shaderUniforms.maxBounds = Cartesian3.clone(
    maxBounds,
    shaderUniforms.maxBounds
  );

  const hasBounds =
    !Cartesian3.equals(minBounds, defaultMinBounds) &&
    !Cartesian3.equals(maxBounds, defaultMaxBounds);
  shaderDefines.BOX_BOUNDS = hasBounds ? 1 : undefined;

  return true;
};

const scratchMinBounds = new Cartesian3();
const scratchMaxBounds = new Cartesian3();
const scratchMinLerp = new Cartesian3();
const scratchMaxLerp = new Cartesian3();

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

  const sizeAtLevel = 1.0 / Math.pow(2, tileLevel);

  const minBounds = Cartesian3.lerp(
    this._minBounds,
    this._maxBounds,
    Cartesian3.fromElements(
      sizeAtLevel * tileX,
      sizeAtLevel * tileY,
      sizeAtLevel * tileZ,
      scratchMinLerp
    ),
    scratchMinBounds
  );

  const maxBounds = Cartesian3.lerp(
    this._minBounds,
    this._maxBounds,
    Cartesian3.fromElements(
      sizeAtLevel * (tileX + 1),
      sizeAtLevel * (tileY + 1),
      sizeAtLevel * (tileZ + 1),
      scratchMaxLerp
    ),
    scratchMaxBounds
  );

  return getBoxChunkObb(minBounds, maxBounds, this.shapeTransform, result);
};

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 *
 * @param {Cartesian3} dimensions The voxel grid dimensions for a tile.
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
 * @param {Number} minimumBounds The minimum bounds.
 * @param {Number} maximumBounds The maximum bounds.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getBoxChunkObb(minimumBounds, maximumBounds, matrix, result) {
  const defaultMinBounds = VoxelBoxShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelBoxShape.DefaultMaxBounds;

  const isDefaultBounds =
    Cartesian3.equals(minimumBounds, defaultMinBounds) &&
    Cartesian3.equals(maximumBounds, defaultMaxBounds);

  if (isDefaultBounds) {
    result.center = Matrix4.getTranslation(matrix, result.center);
    result.halfAxes = Matrix4.getMatrix3(matrix, result.halfAxes);
  } else {
    let scale = Matrix4.getScale(matrix, scratchScale);
    const translation = Matrix4.getTranslation(matrix, scratchTranslation);
    result.center = Cartesian3.fromElements(
      translation.x + scale.x * 0.5 * (minimumBounds.x + maximumBounds.x),
      translation.y + scale.y * 0.5 * (maximumBounds.y + minimumBounds.y),
      translation.z + scale.z * 0.5 * (maximumBounds.z + minimumBounds.z),
      result.center
    );
    scale = Cartesian3.fromElements(
      scale.x * 0.5 * (maximumBounds.x - minimumBounds.x),
      scale.y * 0.5 * (maximumBounds.y - minimumBounds.y),
      scale.z * 0.5 * (maximumBounds.z - minimumBounds.z),
      scratchScale
    );
    const rotation = Matrix4.getRotation(matrix, scratchRotation);
    result.halfAxes = Matrix3.setScale(rotation, scale, result.halfAxes);
  }

  return result;
}

export default VoxelBoxShape;
