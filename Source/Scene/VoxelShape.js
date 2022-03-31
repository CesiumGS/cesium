import DeveloperError from "../Core/DeveloperError.js";

/**
 * Controls per-shape behavior for culling and rendering voxel grids.
 * This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias VoxelShape
 * @constructor
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VoxelBoxShape
 * @see VoxelEllipsoidShape
 * @see VoxelCylinderShape
 * @see VoxelShapeType
 */
function VoxelShape() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(VoxelShape.prototype, {
  /**
   * An oriented bounding box containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {OrientedBoundingBox}
   */
  orientedBoundingBox: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A bounding sphere containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {BoundingSphere}
   */
  boundingSphere: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   */
  boundTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   */
  shapeTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Check if the shape is visible. For example, if the shape has zero scale it will be invisible.
   * The update function must be called before accessing this value.
   * @type {Boolean}
   */
  isVisible: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Update the shape's state.
 * @function
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelShape.prototype.update = DeveloperError.throwInstantiationError;

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
 * @function
 * @param {Number} tileLevel The tile's level.
 * @param {Number} tileX The tile's x coordinate.
 * @param {Number} tileY The tile's y coordinate.
 * @param {Number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile.
 * @returns {OrientedBoundingBox} The oriented bounding box.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelShape.prototype.computeOrientedBoundingBoxForTile =
  DeveloperError.throwInstantiationError;

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 * @function
 * @param {Cartesian3} voxelDimensions The voxel grid dimensions for a tile.
 * @returns {Number} The step size.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelShape.prototype.computeApproximateStepSize =
  DeveloperError.throwInstantiationError;

/**
 * Defines the minimum bounds of the shape. This can vary per-shape.
 * @type {Cartesian3}
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelShape.DefaultMinBounds = DeveloperError.throwInstantiationError;

/**
 * Defines the maximum bounds of the shape. This can vary per-shape.
 * @type {Cartesian3}
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelShape.DefaultMaxBounds = DeveloperError.throwInstantiationError;

export default VoxelShape;
