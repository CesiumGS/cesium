import ExperimentalFeatures from "../../Core/ExperimentalFeatures.js";
import ModelExperimental from "./ModelExperimental.js";
import Model from "../Model.js";
/**
 * @private
 */
export default function getModelClass() {
  if (ExperimentalFeatures.enableModelExperimental) {
    return ModelExperimental;
  }
  return Model;
}
