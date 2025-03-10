/**
 * Metadata ordering for voxel content.
 * In all cases, x data is contiguous in strides along the y axis,
 * and each group of y strides represents a z slice.
 * However, the orientation of the axes follows different conventions.
 * @enum {number}
 */
const VoxelMetadataOrder = {
  XYZ: 0, // Default ordering following the 3D Tiles convention. Z-axis points upward.
  GLTF: 1, // Ordering following the glTF convention. Y-axis points upward.
};
export default Object.freeze(VoxelMetadataOrder);
