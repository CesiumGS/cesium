// @ts-check

import { Check, DeveloperError, destroyObject } from "@cesium/core";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPrimitive from "./BufferPrimitive.js"; */

/**
 * @typedef {object} VectorLayerOptions
 * @property {BufferPrimitiveCollection<BufferPrimitive>} collection The primitives drawn by the layer.
 * @property {boolean} [show=true] Whether the layer is drawn.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Draws the primitives of a {@link BufferPrimitiveCollection} with a style
 * held by the layer. Several layers may draw the same collection. Layers are
 * drawn when added to {@link Scene#vectorLayers}.
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see CircleLayer
 * @see VectorLayerCollection
 */
class VectorLayer {
  /**
   * @param {VectorLayerOptions} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.collection", options.collection);
    //>>includeEnd('debug');

    /**
     * @type {BufferPrimitiveCollection<BufferPrimitive>}
     * @protected
     * @ignore
     */
    this._collection = options.collection;

    /**
     * Whether the layer is drawn.
     * @type {boolean}
     * @default true
     */
    this.show = options.show ?? true;

    /**
     * @type {{destroy: Function}|undefined}
     * @protected
     * @ignore
     */
    this._renderContext = undefined;
  }

  /**
   * The primitives drawn by the layer. The layer does not own the collection;
   * destroying the layer leaves the collection intact.
   *
   * @type {BufferPrimitiveCollection<BufferPrimitive>}
   * @readonly
   */
  get collection() {
    return this._collection;
  }

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    const passes = frameState.passes;
    if (!this.show || !(passes.render || passes.pick)) {
      return;
    }

    // Updates bounds and pick ids without drawing the collection itself.
    BufferPrimitiveCollection.prototype.update.call(
      this._collection,
      frameState,
    );

    this._renderContext = this._render(frameState, this._renderContext);
  }

  /**
   * Draws the collection, returning the render context to pass on the next call.
   *
   * @param {FrameState} frameState
   * @param {*} renderContext
   * @returns {*}
   * @protected
   * @abstract
   * @ignore
   */
  _render(frameState, renderContext) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   *
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys the GPU resources of the layer. The collection is not destroyed.
   */
  destroy() {
    this._renderContext?.destroy();
    this._renderContext = undefined;
    return destroyObject(this);
  }
}

export default VectorLayer;
