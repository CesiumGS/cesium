/**
 * An enum for controling how {@link CustomShader} handles translucency compared with the original
 * primitive.
 *
 * @enum {number}
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const CustomShaderTranslucencyMode = {
  /**
   * Inherit translucency settings from the primitive's material. If the primitive used a
   * translucent material, the custom shader will also be considered translucent. If the primitive
   * used an opaque material, the custom shader will be considered opaque.
   *
   * @type {number}
   * @constant
   */
  INHERIT: 0,
  /**
   * Force the primitive to render the primitive as opaque, ignoring any material settings.
   *
   * @type {number}
   * @constant
   */
  OPAQUE: 1,
  /**
   * Force the primitive to render the primitive as translucent, ignoring any material settings.
   *
   * @type {number}
   * @constant
   */
  TRANSLUCENT: 2,
};

export default Object.freeze(CustomShaderTranslucencyMode);
