/**
 * An enum describing what commands (opaque) are required by a Cesium3DTileStyle.
 *
 * @private
 */
var StyleCommandsNeeded = {
  ALL_OPAQUE: 0,
  ALL_TRANSLUCENT: 1,
  OPAQUE_AND_TRANSLUCENT: 2,
};

export default Object.freeze(StyleCommandsNeeded);
