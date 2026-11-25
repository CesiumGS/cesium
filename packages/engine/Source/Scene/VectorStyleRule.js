// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import Expression from "./Expression.js";
import SymbologyLayer from "./SymbologyLayer.js";
import SymbologyLayerCollection from "./SymbologyLayerCollection.js";

/** @import CircleSymbolizer from "./CircleSymbolizer.js"; */

/**
 * @typedef {object} VectorStyleRuleOptions
 * @property {string|boolean} [condition=true] An expression in the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language} that selects the features the rule applies to.
 * @property {SymbologyLayer[]} [symbologyLayers] How the selected features are drawn, one entry per drawing level.
 * @property {CircleSymbolizer[]} [symbolizers] The symbolizers of a rule with a single {@link SymbologyLayer}. Must not be combined with <code>symbologyLayers</code>.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * A condition paired with the {@link SymbologyLayer} instances that draw the
 * features it selects. Within a {@link VectorStyle}, each feature is drawn by
 * the first rule whose condition it matches.
 *
 * @example
 * const rule = new Cesium.VectorStyleRule({
 *   condition: "${population} > 1000000",
 *   symbolizers: [new Cesium.CircleSymbolizer({ radius: 10, color: "color('red')" })],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see SymbologyLayer
 * @see VectorStyle
 */
class VectorStyleRule {
  /**
   * @param {VectorStyleRuleOptions} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    if (defined(options.symbologyLayers) === defined(options.symbolizers)) {
      throw new DeveloperError(
        "Exactly one of options.symbologyLayers and options.symbolizers must be defined.",
      );
    }
    //>>includeEnd('debug');

    /**
     * @type {string|boolean}
     * @private
     */
    this._condition = options.condition ?? true;

    /**
     * @type {Expression|undefined}
     * @private
     */
    this._conditionExpression =
      typeof this._condition === "string"
        ? new Expression(this._condition)
        : undefined;

    /**
     * @type {SymbologyLayerCollection}
     * @private
     */
    this._symbologyLayers = new SymbologyLayerCollection(
      defined(options.symbolizers)
        ? [new SymbologyLayer({ symbolizers: options.symbolizers })]
        : options.symbologyLayers,
    );
  }

  /**
   * An expression in the 3D Tiles Styling language that selects the features
   * the rule applies to.
   *
   * @type {string|boolean}
   * @readonly
   */
  get condition() {
    return this._condition;
  }

  /**
   * How the selected features are drawn, one entry per drawing level.
   *
   * @type {SymbologyLayerCollection}
   * @readonly
   */
  get symbologyLayers() {
    return this._symbologyLayers;
  }

  /**
   * Returns whether the condition selects the feature.
   *
   * @param {*} feature
   * @returns {boolean}
   * @ignore
   */
  _matches(feature) {
    if (defined(this._conditionExpression)) {
      return Boolean(this._conditionExpression.evaluate(feature));
    }
    return this._condition === true;
  }
}

export default VectorStyleRule;
