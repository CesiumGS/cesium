/**
 * Atmosphere lighting effects (sky atmosphere, ground atmosphere, fog) can be
 * further modified with dynamic lighting from the sun or other light source
 * that changes over time. This enum determines which light source to use.
 *
 * @enum {number}
 */
const DynamicAtmosphereLightingType = {
  /**
   * Do not use dynamic atmosphere lighting. Anything that uses atmosphere
   * lighting will be lit from directly above the vertex/fragment
   *
   * @type {number}
   * @constant
   */
  OFF: 0,
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

export default Object.freeze(DynamicAtmosphereLightingType);
