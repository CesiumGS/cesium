// @ts-check

import { Check } from "@cesium/core";

/** @import SymbologyLayer from "./SymbologyLayer.js"; */

/**
 * The ordered {@link SymbologyLayer} instances of a {@link VectorStyle}. Later
 * layers are drawn above earlier ones.
 *
 * @example
 * style.symbologyLayers.add(
 *   new Cesium.SymbologyLayer({
 *     name: "selection",
 *     rules: [selectionRule],
 *   }),
 * );
 * const vectors = viewer.scene.primitives.add(style.createPrimitives(collection));
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyle#symbologyLayers
 */
class SymbologyLayerCollection {
  /**
   * @privateParam {SymbologyLayer[]} [symbologyLayers] The layers, in drawing order.
   */
  constructor(/** @type {SymbologyLayer[]} */ symbologyLayers = []) {
    /**
     * @type {SymbologyLayer[]}
     * @private
     */
    this._layers = [...symbologyLayers];
  }

  /**
   * The number of layers.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._layers.length;
  }

  /**
   * Adds a layer above the existing layers. Primitives already created by the
   * style are not affected.
   *
   * @param {SymbologyLayer} symbologyLayer The layer to add.
   * @returns {SymbologyLayer} The added layer.
   */
  add(symbologyLayer) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("symbologyLayer", symbologyLayer);
    //>>includeEnd('debug');

    this._layers.push(symbologyLayer);
    return symbologyLayer;
  }

  /**
   * Gets the layer at the given index.
   *
   * @param {number} index The index.
   * @returns {SymbologyLayer} The layer.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("index", index);
    //>>includeEnd('debug');

    return this._layers[index];
  }

  /**
   * Checks whether this collection contains the given layer.
   *
   * @param {SymbologyLayer} [symbologyLayer] The layer to check for.
   * @returns {boolean} <code>true</code> if the collection contains the layer, <code>false</code> otherwise.
   */
  contains(symbologyLayer) {
    return this._layers.includes(symbologyLayer);
  }

  /**
   * Gets all layers with the given name. Names are not required to be unique.
   *
   * @param {string} name The layer name.
   * @returns {SymbologyLayer[]} The matching layers.
   */
  getByName(name) {
    return this._layers.filter((layer) => layer.name === name);
  }
}

export default SymbologyLayerCollection;
