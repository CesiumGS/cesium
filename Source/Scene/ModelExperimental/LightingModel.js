/**
 * The lighting model to use for lighting a {@link ModelExperimental}. This
 * is applied in the {@link LightingPipelineStage}.
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
   * Use physically-based rendering lighting calculations. This includes
   * both PBR metallic roughness and PBR specular glossiness. Image-based
   * lighting is also applied when possible.
   *
   * @type {Number}
   * @constant
   */
  PBR: 1,
};

export default Object.freeze(LightingModel);
