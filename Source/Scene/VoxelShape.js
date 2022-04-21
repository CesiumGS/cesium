import DeveloperError from "../Core/DeveloperError.js";

/**
 * Controls per-shape behavior for culling and rendering voxel grids.
 * This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias VoxelShape
 * @constructor
 *
 * @see VoxelBoxShape
 * @see VoxelEllipsoidShape
 * @see VoxelCylinderShape
 * @see VoxelShapeType
 *
 * @private
 */
function VoxelShape() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(VoxelShape.prototype, {
  /**
   * An oriented bounding box containing the bounded shape.
   * The update function must be called before accessing this value.
   *
   * @memberof VoxelShape.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   */
  orientedBoundingBox: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A bounding sphere containing the bounded shape.
   * The update function must be called before accessing this value.
   *
   * @memberof VoxelShape.prototype
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the bounded shape.
   * The update function must be called before accessing this value.
   *
   * @memberof VoxelShape.prototype
   * @type {Matrix4}
   * @readonly
   */
  boundTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   * The update function must be called before accessing this value.
   *
   * @memberof VoxelShape.prototype
   * @type {Matrix4}
   * @readonly
   */
  shapeTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  shaderUniforms: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  shaderDefines: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @type {Number}
   * @readonly
   */
  shaderMaximumIntersectionsLength: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @returns {Boolean} Whether the shape is visible.
 */
VoxelShape.prototype.update = DeveloperError.throwInstantiationError;

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
 *
 * @param {Number} tileLevel The tile's level.
 * @param {Number} tileX The tile's x coordinate.
 * @param {Number} tileY The tile's y coordinate.
 * @param {Number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile.
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelShape.prototype.computeOrientedBoundingBoxForTile =
  DeveloperError.throwInstantiationError;

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 *
 * @param {Cartesian3} voxelDimensions The voxel grid dimensions for a tile.
 * @returns {Number} The step size.
 */
VoxelShape.prototype.computeApproximateStepSize =
  DeveloperError.throwInstantiationError;

/**
 * Defines the minimum bounds of the shape. The meaning can vary per-shape.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelShape.DefaultMinBounds = DeveloperError.throwInstantiationError;

/**
 * Defines the maximum bounds of the shape. The meaning can vary per-shape.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelShape.DefaultMaxBounds = DeveloperError.throwInstantiationError;

export default VoxelShape;
