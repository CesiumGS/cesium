/**
 * Which lighting model to use for lighting a {@link ModelExperimental}. This
 * is applied in the {@link LightingPipelineStage}
 *
 * @enum {Number}
 * @private
 */
var LightingModel = {
  /**
   * Use unlit shading, i.e. skip lighting calculations. The model's
   * diffuse color (assumed to be linear RGB, not sRGB) is used directly
   * when computing <code>gl_FragColor</code>. The alpha mode is still
   * applied.
   *
   * @type {Number}
   * @constant
   */
  UNLIT: 0,
  /**
   * Use physically-based rendering lighting calculations. glTF models support
   * the metallic roughness model as well as the specular glossiness model
   * (with KHR_materials_pbrSpecularGlossiness). Image-based lighting is also
   * applied when possible. Ensure high dynamic range (See {@link Scene.highDynamicRange})
   * is enabled for best quality results.
   *
   * @type {Number}
   * @constant
   */
  PBR: 1,
};

export default Object.freeze(LightingModel);
