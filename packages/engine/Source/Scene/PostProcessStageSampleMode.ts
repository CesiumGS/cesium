/**
 * Determines how input texture to a {@link PostProcessStage} is sampled.
 *
 * @enum {number}
 */
const PostProcessStageSampleMode = {
  /**
   * Samples the texture by returning the closest texel.
   *
   * @type {number}
   * @constant
   */
  NEAREST: 0,
  /**
   * Samples the texture through bi-linear interpolation of the four nearest texels.
   *
   * @type {number}
   * @constant
   */
  LINEAR: 1,
};
export default PostProcessStageSampleMode;
