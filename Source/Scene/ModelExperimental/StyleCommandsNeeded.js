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

/**
 * @private
 */
StyleCommandsNeeded.getStyleCommandsNeeded = function (
  featuresLength,
  translucentFeaturesLength
) {
  if (translucentFeaturesLength === 0) {
    return StyleCommandsNeeded.ALL_OPAQUE;
  } else if (translucentFeaturesLength === featuresLength) {
    return StyleCommandsNeeded.ALL_TRANSLUCENT;
  }
  return StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;
};

export default Object.freeze(StyleCommandsNeeded);
