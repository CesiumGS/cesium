import Frozen from "../../Core/Frozen.js";
import LightingModel from "./LightingModel.js";

/**
 * Options for configuring the {@link LightingPipelineStage}
 *
 * @param {object} options An object containing the following options
 * @param {LightingModel} [options.lightingModel=LightingModel.UNLIT] The lighting model to use
 *
 * @alias ModelLightingOptions
 * @constructor
 *
 * @private
 */
function ModelLightingOptions(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * The lighting model to use, such as UNLIT or PBR. This is determined by
   * the primitive's material.
   *
   * @type {LightingModel}
   *
   * @private
   */
  this.lightingModel = options.lightingModel ?? LightingModel.UNLIT;
}

export default ModelLightingOptions;
