/**
 * Options for configuring the {@link AlphaPipelineStage}
 *
 * @alias ModelAlphaOptions
 * @constructor
 *
 * @private
 */
function ModelAlphaOptions() {
  /**
   * Which render pass will render the model.
   *
   * @type {Pass}
   * @private
   */
  this.pass = undefined;
  /**
   * Determines the alpha threshold below which fragments are discarded
   *
   * @type {number}
   * @private
   */
  this.alphaCutoff = undefined;
}

export default ModelAlphaOptions;
