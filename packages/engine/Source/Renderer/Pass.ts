/**
 * The render pass for a command.
 *
 * @private
 */
const Pass = {
  // If you add/modify/remove Pass constants, also change the automatic GLSL constants
  // that start with 'czm_pass'
  //
  // Commands are executed in order by pass up to the translucent pass.
  // Translucent geometry needs special handling (sorting/OIT). The compute pass
  // is executed first and the overlay pass is executed last. Both are not sorted
  // by frustum.
  ENVIRONMENT: 0,
  COMPUTE: 1,
  GLOBE: 2,
  TERRAIN_CLASSIFICATION: 3,
  CESIUM_3D_TILE_EDGES: 4,
  CESIUM_3D_TILE: 5,
  CESIUM_3D_TILE_CLASSIFICATION: 6,
  CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW: 7,
  OPAQUE: 8,
  TRANSLUCENT: 9,
  VOXELS: 10,
  GAUSSIAN_SPLATS: 11,
  OVERLAY: 12,
  NUMBER_OF_PASSES: 13,
};
export default Object.freeze(Pass);
