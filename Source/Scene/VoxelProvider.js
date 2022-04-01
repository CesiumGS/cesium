import DeveloperError from "../Core/DeveloperError.js";

/**
 * Provides voxel data. Intended to be used with {@link VoxelPrimitive}.
 * This type describes an interface and is not intended to be instantiated directly.
 *
 * @alias VoxelProvider
 * @constructor
 *
 * @see Cesium3DTilesVoxelProvider
 * @see GltfVoxelProvider
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
   * Gets a value indicating whether or not the provider is ready for use.
   *
   * @memberof VoxelProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the promise that will be resolved when the provider is ready for use.
   *
   * @memberof VoxelProvider.prototype
   * @type {Promise.<VoxelProvider>}
   * @readonly
   */
  readyPromise: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * A model matrix that is applied to all tiles. If undefined, the identity matrix will be used instead.
   *
   * @memberof VoxelProvider.prototype
   * @type {Matrix4|undefined}
   * @readonly
   */
  modelMatrix: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the {@link VoxelShapeType}
   * This should not be called before {@link VoxelProvider#ready} returns true.
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
   * This should not be called before {@link VoxelProvider#ready} returns true.
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
   * This should not be called before {@link VoxelProvider#ready} returns true.
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
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3}
   * @readonly
   */
  dimensions: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of padding voxels before the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage. If
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  paddingBefore: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the number of padding voxels after the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage. If
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {Cartesian3|undefined}
   * @readonly
   */
  paddingAfter: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata names.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {String[]}
   * @readonly
   */
  names: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata types
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {MetadataType[]}
   * @readonly
   */
  types: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata component types
   * This should not be called before {@link VoxelProvider#ready} returns true.
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
   * @type {Number[][]|undefined}
   * @readonly
   */
  minimumValues: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the metadata maximum values.
   *
   * @memberof VoxelProvider.prototype
   * @type {Number[][]|undefined}
   * @readonly
   */
  maximumValues: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The maximum number of tiles that exist for this provider. This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory. If this value is not known it can be undefined.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @memberof VoxelProvider.prototype
   * @type {Number|undefined}
   * @readonly
   */
  maximumTileCount: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Requests the data for a given tile. The data is a flattened 3D array ordered by X, then Y, then Z.
 * This function should not be called before {@link VoxelProvider#ready} returns true.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Number} [options.tileLevel=0] The tile's level.
 * @param {Number} [options.tileX=0] The tile's X coordinate.
 * @param {Number} [options.tileY=0] The tile's Y coordinate.
 * @param {Number} [options.tileZ=0] The tile's Z coordinate.
 * @returns {Promise<Array[]>|undefined} An array of promises for the requested voxel data or undefined if there was a problem loading the data.
 *
 * @exception {DeveloperError} The provider must be ready.
 */
VoxelProvider.prototype.requestData = DeveloperError.throwInstantiationError;

/**
 * A hook to update the provider every frame, called from {@link VoxelPrimitive.update}.
 * If the provider doesn't need this functionality it should leave this function undefined.
 *
 * @param {FrameState} frameState
 */
VoxelProvider.prototype.update = DeveloperError.throwInstantiationError;

export default VoxelProvider;
