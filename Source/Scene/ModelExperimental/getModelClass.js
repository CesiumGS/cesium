import ExperimentalFeatures from "../../Core/ExperimentalFeatures.js";
import ModelExperimental from "./ModelExperimental.js";
import Model from "../Model.js";
/**
 * Select either {@link Model} or {@link ModelExperimental} depending on
 * an experimental flag. This is a cleaner way to select between them at
 * runtime.
 *
 * @return {Model|ModelExperimental} The class of the Model to use.
 *
 * @private
 */
export default function getModelClass() {
  if (ExperimentalFeatures.enableModelExperimental) {
    return ModelExperimental;
  }
  return Model;
}
