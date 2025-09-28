/**
 * Metadata ordering for voxel content.
 * In all cases, x data is contiguous in strides along the y axis,
 * and each group of y strides represents a z slice.
 * However, the orientation of the axes follows different conventions.
 *
 * @enum {number}
 * @private
 */
const VoxelMetadataOrder = {
  /**
   * The default ordering following the 3D Tiles convention. Z-axis points upward.
   * @type {number}
   * @constant
   */
  Z_UP: 0,
  /**
   * The ordering following the glTF convention. Y-axis points upward.
   * @type {number}
   * @constant
   */
  Y_UP: 1,
};
export default Object.freeze(VoxelMetadataOrder);
