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

    /**
     * Visual properties, each a value or a per-primitive callback.
     * @type {Record<string, *>}
     * @protected
     * @ignore
     */
    this._style = {};

    /**
     * @type {boolean}
     * @ignore
     */
    this._hasStyleCallbacks = false;

    /**
     * Incremented whenever a visual property changes; renderers compare it to
     * decide when to re-evaluate per-primitive callbacks.
     * @type {number}
     * @ignore
     */
    this._styleVersion = 0;
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
   * Marks the visual properties as dirty, so per-primitive callbacks are
   * evaluated again on the next frame. Callbacks are otherwise evaluated only
   * when a primitive changes or a property is assigned, so call this after
   * changing data that a callback reads.
   */
  makeStyleDirty() {
    this._styleVersion++;
  }

  /**
   * @param {string} name
   * @returns {*}
   * @protected
   * @ignore
   */
  _getStyle(name) {
    return this._style[name];
  }

  /**
   * @param {string} name
   * @param {*} value
   * @protected
   * @ignore
   */
  _setStyle(name, value) {
    this._style[name] = value;
    this._hasStyleCallbacks = Object.values(this._style).some(
      (styleValue) => typeof styleValue === "function",
    );
    this._styleVersion++;
  }

  /**
   * Returns the value of a visual property for a primitive, calling it if it
   * is a callback.
   *
   * @param {*} value
   * @param {BufferPrimitive} primitive
   * @returns {*}
   * @protected
   * @ignore
   */
  static _evaluate(value, primitive) {
    return typeof value === "function" ? value(primitive) : value;
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
