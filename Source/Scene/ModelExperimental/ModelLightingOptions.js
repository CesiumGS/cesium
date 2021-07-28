import defaultValue from "../../Core/defaultValue.js";
import LightingModel from "./LightingModel.js";

/**
 * TODO
 * @param {Object} options An object containing the following options
 * @param {LightingModel} [options.lightingModel=LightingModel.UNLIT] The lighting model to use
 */
export default function ModelLightingOptions(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this.lightingModel = defaultValue(options.lightingModel, LightingModel.UNLIT);

  // TODO: if we support KHR_materials_common or KHR_lights_punctual,
  // we would have additional settings for point lights
}
