import DeveloperError from "../Core/DeveloperError.js";

/**
 * Provides voxel data. Intended to be used with {@link VoxelPrimitive}.
 * This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias VoxelProvider
 * @constructor
 *
 * @see Cesium3DTilesVoxelProvider
 * @see VoxelPrimitive
 * @see VoxelShapeType
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelProvider() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(VoxelProvider.prototype, {
  /**
   * A transform from local space to global space.
   *
   * @memberof VoxelProvider.prototype
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   * @readonly
   */
  globalTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A transform from shape space to local space.
   *
   * @memberof VoxelProvider.prototype
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   * @readonly
   */
  shapeTransform: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the {@link VoxelShapeType}
   *
   * @memberof VoxelProvider.prototype
   * @type {VoxelShapeType}
   * @readonly
   */
  shape: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the minimum bounds.
   * If undefined, the shape's default minimum bounds will be used instead.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  minBounds: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the maximum bounds.
   * If undefined, the shape's default maximum bounds will be used instead.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  maxBounds: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of voxels per dimension of a tile. This is the same for all tiles in the dataset.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3}
   * @readonly
   */
  dimensions: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of padding voxels before the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   * @readonly
   */
  paddingBefore: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of padding voxels after the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   * @readonly
   */
  paddingAfter: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata names.
   *
   * @memberof VoxelProvider.prototype
   * @type {string[]}
   * @readonly
   */
  names: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata types.
   *
   * @memberof VoxelProvider.prototype
   * @type {MetadataType[]}
   * @readonly
   */
  types: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata component types.
   *
   * @memberof VoxelProvider.prototype
   * @type {MetadataComponentType[]}
   * @readonly
   */
  componentTypes: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata minimum values.
   *
   * @memberof VoxelProvider.prototype
   * @type {number[][]|undefined}
   * @readonly
   */
  minimumValues: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata maximum values.
   *
   * @memberof VoxelProvider.prototype
   * @type {number[][]|undefined}
   * @readonly
   */
  maximumValues: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The maximum number of tiles that exist for this provider.
   * This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory.
   * If this value is not known it can be undefined.
   *
   * @memberof VoxelProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumTileCount: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The number of levels of detail containing available tiles in the tileset.
   *
   * @type {number|undefined}
   * @readonly
   */
  availableLevels: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of keyframes in the dataset.
   *
   * @memberof VoxelProvider.prototype
   * @type {number|undefined}
   * @readonly
   * @private
   */
  keyframeCount: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the {@link TimeIntervalCollection} for the dataset,
   * or undefined if it doesn't have timestamps.
   *
   * @memberof VoxelProvider.prototype
   * @type {TimeIntervalCollection|undefined}
   * @readonly
   * @private
   */
  timeIntervalCollection: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Requests the data for a given tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number} [options.tileLevel=0] The tile's level.
 * @param {number} [options.tileX=0] The tile's X coordinate.
 * @param {number} [options.tileY=0] The tile's Y coordinate.
 * @param {number} [options.tileZ=0] The tile's Z coordinate.
 * @privateparam {number} [options.keyframe=0] The requested keyframe.
 * @returns {Promise<VoxelContent>|undefined} A promise resolving to a VoxelContent containing the data for the tile, or undefined if the request could not be scheduled this frame.
 */
VoxelProvider.prototype.requestData = function (options) {
  DeveloperError.throwInstantiationError();
};

export default VoxelProvider;
