// @ts-check

import destroyObject from "../../Core/destroyObject";
import DeveloperError from "../../Core/DeveloperError";
/** @import Context from "../../Renderer/Context"; */
/** @import Buffer from "../../Renderer/Buffer"; */

/**
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

  /**
   * The vertex buffer of packed per-vertex binding data, valid after
   * {@link DeformerBinding#initialize} has run.
   * @returns {Buffer | undefined}
   */
  getVertexBuffer() {
    DeveloperError.throwInstantiationError();
  }

  destroy() {
    return destroyObject(this);
  }
}

export default DeformerBinding;
