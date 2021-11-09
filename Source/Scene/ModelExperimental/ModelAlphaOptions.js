/**
 * Options for configuring the {@link AlphaPipelineStage}
 *
 * @alias ModelAlphaOptions
 * @constructor
 *
 * @private
 */
export default function ModelAlphaOptions() {
  /**
   * Which render pass will render the model.
   *
   * @type {Pass}
   * @private
   */
  this.pass = undefined;
  /**
   * Which method to use for handling the alpha channel in the fragment shader.
   *
   * @type {AlphaMode}
   * @private
   */
  this.alphaMode = undefined;
  /**
   * When the alpha mode is MASK, this determines the alpha threshold
   * below which fragments are discarded
   *
   * @type {Number}
   * @private
   */
  this.alphaCutoff = undefined;
}
