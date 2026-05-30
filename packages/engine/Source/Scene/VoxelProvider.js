// @ts-check

import DeveloperError from "../Core/DeveloperError.js";

/** @import Cartesian3 from "../Core/Cartesian3.js"; */
/** @import Matrix4 from "../Core/Matrix4.js"; */
/** @import MetadataComponentType from "./MetadataComponentType.js"; */
/** @import MetadataType from "./MetadataType.js"; */
/** @import TimeIntervalCollection from "../Core/TimeIntervalCollection.js"; */
/** @import VoxelContent from "./VoxelContent.js"; */
/** @import VoxelShapeType from "./VoxelShapeType.js"; */

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
class VoxelProvider {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

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
  requestData(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * A transform from local space to global space.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   * @readonly
   */
  globalTransform;

  /**
   * A transform from shape space to local space.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   * @readonly
   */
  shapeTransform;

  /**
   * Gets the {@link VoxelShapeType}
   *
   * @type {VoxelShapeType}
   * @readonly
   */
  shape;

  /**
   * Gets the minimum bounds.
   * If undefined, the shape's default minimum bounds will be used instead.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  minBounds;

  /**
   * Gets the maximum bounds.
   * If undefined, the shape's default maximum bounds will be used instead.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  maxBounds;

  /**
   * Gets the number of voxels per dimension of a tile. This is the same for all tiles in the dataset.
   *
   * @type {Cartesian3}
   * @readonly
   */
  dimensions;

  /**
   * Gets the number of padding voxels before the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   * @readonly
   */
  paddingBefore;

  /**
   * Gets the number of padding voxels after the tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   *
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   * @readonly
   */
  paddingAfter;

  /**
   * Gets the metadata names.
   *
   * @type {string[]}
   * @readonly
   */
  names;

  /**
   * Gets the metadata types.
   *
   * @type {MetadataType[]}
   * @readonly
   */
  types;

  /**
   * Gets the metadata component types.
   *
   * @type {MetadataComponentType[]}
   * @readonly
   */
  componentTypes;

  /**
   * Gets the metadata minimum values.
   *
   * @type {number[][]|undefined}
   * @readonly
   */
  minimumValues;

  /**
   * Gets the metadata maximum values.
   *
   * @type {number[][]|undefined}
   * @readonly
   */
  maximumValues;

  /**
   * The maximum number of tiles that exist for this provider.
   * This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory.
   * If this value is not known it can be undefined.
   *
   * @type {number|undefined}
   * @readonly
   */
  maximumTileCount;

  /**
   * The number of levels of detail containing available tiles in the tileset.
   *
   * @type {number|undefined}
   * @readonly
   */
  availableLevels;

  /**
   * Gets the number of keyframes in the dataset.
   *
   * @type {number|undefined}
   * @readonly
   * @private
   */
  keyframeCount;

  /**
   * Gets the {@link TimeIntervalCollection} for the dataset,
   * or undefined if it doesn't have timestamps.
   *
   * @type {TimeIntervalCollection|undefined}
   * @readonly
   * @private
   */
  timeIntervalCollection;
}

export default VoxelProvider;
