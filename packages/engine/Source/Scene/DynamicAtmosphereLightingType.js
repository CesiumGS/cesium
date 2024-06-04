/**
 * Atmosphere lighting effects (sky atmosphere, ground atmosphere, fog) can be
 * further modified with dynamic lighting from the sun or other light source
 * that changes over time. This enum determines which light source to use.
 *
 * @enum {number}
 */
const DynamicAtmosphereLightingType = {
  /**
   * Do not use dynamic atmosphere lighting. Atmosphere lighting effects will
   * be lit from directly above rather than using the scene's light source.
   *
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * Use the scene's current light source for dynamic atmosphere lighting.
   *
   * @type {number}
   * @constant
   */
  SCENE_LIGHT: 1,
  /**
   * Force the dynamic atmosphere lighting to always use the sunlight direction,
   * even if the scene uses a different light source.
   *
   * @type {number}
   * @constant
   */
  SUNLIGHT: 2,
};

/**
 * Get the lighting enum from the older globe flags
 *
 * @param {Globe} globe The globe
 * @return {DynamicAtmosphereLightingType} The corresponding enum value
 *
 * @private
 */
DynamicAtmosphereLightingType.fromGlobeFlags = function (globe) {
  const lightingOn = globe.enableLighting && globe.dynamicAtmosphereLighting;
  if (!lightingOn) {
    return DynamicAtmosphereLightingType.NONE;
  }

  // Force sunlight
  if (globe.dynamicAtmosphereLightingFromSun) {
    return DynamicAtmosphereLightingType.SUNLIGHT;
  }

  return DynamicAtmosphereLightingType.SCENE_LIGHT;
};

export default Object.freeze(DynamicAtmosphereLightingType);
