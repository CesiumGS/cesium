// @ts-check

import { Check } from "@cesium/core";
import BlendOption from "./BlendOption.js";

/** @import CircleSymbolizer from "./CircleSymbolizer.js"; */

/**
 * @typedef {object} SymbologyLayerOptions
 * @property {CircleSymbolizer[]} symbolizers How the features selected by the rule are drawn, in drawing order.
 * @property {string} [name] The name of the layer.
 * @property {number} [zIndex=0] The drawing order of the layer within its {@link VectorStyle}. Layers with a higher zIndex are drawn above layers with a lower one; layers with the same zIndex are drawn in declaration order.
 * @property {BlendOption} [blendOption=BlendOption.TRANSLUCENT] Determines how the layer is blended with the scene. Must be {@link BlendOption.OPAQUE} or {@link BlendOption.TRANSLUCENT}.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * The symbolizers of a {@link VectorStyleRule} drawn at one level of a
 * {@link VectorStyle}. Layers of all rules are drawn in order of
 * {@link SymbologyLayer#zIndex}, so related layers of different rules, such
 * as icons and labels, can be ordered without reordering the rules.
 *
 * @example
 * // Labels of every rule are drawn above the icons of every rule.
 * const style = new Cesium.VectorStyle({
 *   rules: [
 *     new Cesium.VectorStyleRule({
 *       condition: "${type} === 'poi'",
 *       symbologyLayers: [
 *         new Cesium.SymbologyLayer({ symbolizers: [poiIcon] }),
 *         new Cesium.SymbologyLayer({ symbolizers: [poiLabel], zIndex: 1 }),
 *       ],
 *     }),
 *     new Cesium.VectorStyleRule({
 *       condition: "${type} === 'transit'",
 *       symbologyLayers: [
 *         new Cesium.SymbologyLayer({ symbolizers: [transitIcon] }),
 *         new Cesium.SymbologyLayer({ symbolizers: [transitLabel], zIndex: 1 }),
 *       ],
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
    Check.defined("options.symbolizers", options.symbolizers);
    //>>includeEnd('debug');

    /**
     * @type {CircleSymbolizer[]}
     * @private
     */
    this._symbolizers = [...options.symbolizers];

    /**
     * @type {string|undefined}
     * @private
     */
    this._name = options.name;

    /**
     * @type {number}
     * @private
     */
    this._zIndex = options.zIndex ?? 0;

    /**
     * @type {BlendOption}
     * @private
     */
    this._blendOption = options.blendOption ?? BlendOption.TRANSLUCENT;
  }

  /**
   * How the features selected by the rule are drawn, in drawing order.
   *
   * @type {CircleSymbolizer[]}
   * @readonly
   */
  get symbolizers() {
    return this._symbolizers;
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
   * The drawing order of the layer within its {@link VectorStyle}. Higher
   * values are drawn above lower ones.
   *
   * @type {number}
   * @readonly
   */
  get zIndex() {
    return this._zIndex;
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
