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
   * Determines the alpha threshold below which fragments are discarded
   *
   * @type {Number}
   * @private
   */
  this.alphaCutoff = undefined;
}
