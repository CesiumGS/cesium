/**
 * The lighting model to use for lighting a {@link Model}.
 *
 * @enum {number}
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const LightingModel = {
  /**
   * Use unlit shading, i.e. skip lighting calculations. The model's
   * diffuse color (assumed to be linear RGB, not sRGB) is used directly
   * when computing <code>out_FragColor</code>. The alpha mode is still
   * applied.
   *
   * @type {number}
   * @constant
   */
  UNLIT: 0,
  /**
   * Use physically-based rendering lighting calculations. This includes
   * both PBR metallic roughness and PBR specular glossiness. Image-based
   * lighting is also applied when possible.
   *
   * @type {number}
   * @constant
   */
  PBR: 1,
};

export default Object.freeze(LightingModel);
