// @ts-check

/**
 * Determines how the Gaussian splats of a {@link Cesium3DTileset} are composited.
 *
 * @enum {number}
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Cesium3DTileset#gaussianSplatRenderMode
 */
const GaussianSplatRenderMode = {
  /**
   * Splats are sorted back to front and alpha blended. The sort is repeated
   * as the camera moves.
   *
   * @type {number}
   * @constant
   */
  SORTED: 0,

  /**
   * Splats are drawn unsorted with stochastic transparency: each fragment is
   * kept with a probability equal to its opacity. This avoids sorting, but the
   * image is noisy unless it is averaged over successive frames, see
   * {@link PostProcessStageLibrary.createTemporalAntiAliasingStage}.
   *
   * @type {number}
   * @constant
   */
  STOCHASTIC: 1,
};

Object.freeze(GaussianSplatRenderMode);

export default GaussianSplatRenderMode;
