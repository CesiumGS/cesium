// @ts-check

import { Check } from "@cesium/core";
import BlendOption from "./BlendOption.js";

/** @import VectorStyleRule from "./VectorStyleRule.js"; */

/**
 * @typedef {object} SymbologyLayerOptions
 * @property {VectorStyleRule[]} rules The rules of the layer, in order.
 * @property {string} [name] The name of the layer.
 * @property {BlendOption} [blendOption=BlendOption.TRANSLUCENT] Determines how the layer is blended with the scene. Must be {@link BlendOption.OPAQUE} or {@link BlendOption.TRANSLUCENT}.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * An ordered list of {@link VectorStyleRule} instances drawn with the same
 * blending mode. Within a layer, each feature is drawn by the first rule whose
 * condition it matches. Within a {@link VectorStyle}, later layers are drawn
 * above earlier ones.
 *
 * @example
 * const labels = new Cesium.SymbologyLayer({
 *   name: "labels",
 *   blendOption: Cesium.BlendOption.OPAQUE,
 *   rules: [
 *     new Cesium.VectorStyleRule({
 *       symbolizers: [new Cesium.CircleSymbolizer({ color: Cesium.Color.RED })],
 *     }),
 *   ],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyle
 * @see VectorStyleRule
 */
class SymbologyLayer {
  /**
   * @param {SymbologyLayerOptions} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.rules", options.rules);
    //>>includeEnd('debug');

    /**
     * @type {VectorStyleRule[]}
     * @private
     */
    this._rules = [...options.rules];

    /**
     * @type {string|undefined}
     * @private
     */
    this._name = options.name;

    /**
     * @type {BlendOption}
     * @private
     */
    this._blendOption = options.blendOption ?? BlendOption.TRANSLUCENT;
  }

  /**
   * The rules of the layer, in order.
   *
   * @type {VectorStyleRule[]}
   * @readonly
   */
  get rules() {
    return this._rules;
  }

  /**
   * The name of the layer.
   *
   * @type {string|undefined}
   * @readonly
   */
  get name() {
    return this._name;
  }

  /**
   * Determines how the layer is blended with the scene.
   *
   * @type {BlendOption}
   * @readonly
   */
  get blendOption() {
    return this._blendOption;
  }
}

export default SymbologyLayer;
