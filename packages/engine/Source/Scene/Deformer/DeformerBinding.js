// @ts-check

import destroyObject from "../../Core/destroyObject";
import DeveloperError from "../../Core/DeveloperError";
/** @import Context from "../../Renderer/Context"; */

/**
 * For now, an empty class that deformers can subclass to store deformer-related binding data.
 * @abstract
 */
class DeformerBinding {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Called on prerender by the owning Deformer with the webgl context.
   * This gives the binding a chance to create any GPU resources it needs.
   * @param {Context} context
   */
  initialize(context) {
    DeveloperError.throwInstantiationError();
  }

  destroy() {
    return destroyObject(this);
  }
}

export default DeformerBinding;
