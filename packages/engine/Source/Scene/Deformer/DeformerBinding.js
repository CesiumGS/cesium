// @ts-check

import DeveloperError from "../../Core/DeveloperError";

/**
 * For now, an empty class that deformers can subclass to store deformer-related binding data.
 * @abstract
 */
class DeformerBinding {
  constructor() {
    DeveloperError.throwInstantiationError();
  }
}

export default DeformerBinding;
