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
   *
   * @memberof VoxelShape.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   * @private
   */
  orientedBoundingBox: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A bounding sphere containing the bounded shape.
   *
   * @memberof VoxelShape.prototype
   * @type {BoundingSphere}
   * @readonly
   * @private
   */
  boundingSphere: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the bounded shape.
   *
   * @memberof VoxelShape.prototype
   * @type {Matrix4}
   * @readonly
   * @private
   */
  boundTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   *
   * @memberof VoxelShape.prototype
   * @type {Matrix4}
   * @readonly
   * @private
   */
  shapeTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * @memberof VoxelShape.prototype
   * @type {Object<string, any>}
   * @readonly
   * @private
   */
  shaderUniforms: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * @memberof VoxelShape.prototype
   * @type {Object<string, any>}
   * @readonly
   * @private
   */
  shaderDefines: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @memberof VoxelShape.prototype
   * @type {number}
   * @readonly
   * @private
   */
  shaderMaximumIntersectionsLength: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Update the shape's state.
 * @private
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @returns {boolean} Whether the shape is visible.
 */
VoxelShape.prototype.update = DeveloperError.throwInstantiationError;

/**
 * Update any view-dependent transforms.
 * @private
 * @param {FrameState} frameState The frame state.
 */
VoxelShape.prototype.updateViewTransforms =
  DeveloperError.throwInstantiationError;

/**
 * Converts a local coordinate to the shape's UV space.
 * @private
 * @param {Cartesian3} positionLocal The local coordinate to convert.
 * @param {Cartesian3} result The Cartesian3 to store the result in.
 * @returns {Cartesian3} The converted UV coordinate.
 */
VoxelShape.prototype.convertLocalToShapeUvSpace =
  DeveloperError.throwInstantiationError;

/**
 * Computes an oriented bounding box for a specified tile.
 * @private
 * @param {number} tileLevel The tile's level.
 * @param {number} tileX The tile's x coordinate.
 * @param {number} tileY The tile's y coordinate.
 * @param {number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile.
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelShape.prototype.computeOrientedBoundingBoxForTile =
  DeveloperError.throwInstantiationError;

/**
 * Computes an oriented bounding box for a specified sample within a specified tile.
 * @private
 * @param {SpatialNode} spatialNode The spatial node containing the sample
 * @param {Cartesian3} tileDimensions The size of the tile in number of samples, before padding
 * @param {Cartesian3} tileUv The sample coordinate within the tile
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified sample
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelShape.prototype.computeOrientedBoundingBoxForSample =
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
