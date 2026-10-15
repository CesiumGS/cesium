// @ts-check

import { Check, destroyObject } from "@cesium/core";

/** @import FrameState from "./FrameState.js"; */
/** @import VectorLayer from "./VectorLayer.js"; */

/**
 * An ordered collection of {@link VectorLayer} instances drawn by a scene.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Scene#vectorLayers
 */
class VectorLayerCollection {
  constructor() {
    /**
     * @type {VectorLayer[]}
     * @private
     */
    this._layers = [];
  }

  /**
   * The number of layers in the collection.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._layers.length;
  }

  /**
   * Adds a layer to the collection.
   *
   * @param {VectorLayer} layer The layer to add.
   * @param {number} [index] The index to add the layer at. If omitted, the layer is added after all existing layers.
   * @returns {VectorLayer} The added layer.
   *
   * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of layers.
   */
  add(layer, index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("layer", layer);
    if (index !== undefined) {
      Check.typeOf.number.greaterThanOrEquals("index", index, 0);
      Check.typeOf.number.lessThanOrEquals("index", index, this._layers.length);
    }
    //>>includeEnd('debug');

    if (index === undefined) {
      this._layers.push(layer);
    } else {
      this._layers.splice(index, 0, layer);
    }

    return layer;
  }

  /**
   * Removes a layer from the collection, if present.
   *
   * @param {VectorLayer} layer The layer to remove.
   * @param {boolean} [destroy=true] Whether to destroy the layer in addition to removing it.
   * @returns {boolean} <code>true</code> if the layer was removed; <code>false</code> if it was not in the collection.
   */
  remove(layer, destroy = true) {
    const index = this._layers.indexOf(layer);
    if (index === -1) {
      return false;
    }

    this._layers.splice(index, 1);
    if (destroy) {
      layer.destroy();
    }

    return true;
  }

  /**
   * Removes all layers from the collection.
   *
   * @param {boolean} [destroy=true] Whether to destroy the layers in addition to removing them.
   */
  removeAll(destroy = true) {
    if (destroy) {
      for (const layer of this._layers) {
        layer.destroy();
      }
    }

    this._layers.length = 0;
  }

  /**
   * Determines whether the collection contains a layer.
   *
   * @param {VectorLayer} layer The layer to check for.
   * @returns {boolean} <code>true</code> if the collection contains the layer; otherwise, <code>false</code>.
   */
  contains(layer) {
    return this._layers.includes(layer);
  }

  /**
   * Returns the layer at the given index.
   *
   * @param {number} index The index of the layer.
   * @returns {VectorLayer} The layer at the given index.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("index", index);
    //>>includeEnd('debug');

    return this._layers[index];
  }

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    for (const layer of this._layers) {
      layer.update(frameState);
    }
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
   * Destroys every layer in the collection, then the collection itself.
   */
  destroy() {
    this.removeAll(true);
    return destroyObject(this);
  }
}

export default VectorLayerCollection;
