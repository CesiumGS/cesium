// @ts-check

import { Check, defined } from "@cesium/core";
import Expression from "./Expression.js";

/** @import CircleSymbolizer from "./CircleSymbolizer.js"; */

/**
 * @typedef {object} VectorStyleRuleOptions
 * @property {string|boolean} [condition=true] An expression in the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language} that selects the features the rule applies to.
 * @property {CircleSymbolizer[]} symbolizers How the selected features are drawn, in drawing order.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * A condition paired with the symbolizers that draw the features it selects.
 * Within a {@link VectorStyle}, each feature is drawn by the first rule whose
 * condition it matches.
 *
 * @example
 * const rule = new Cesium.VectorStyleRule({
 *   condition: "${population} > 1000000",
 *   symbolizers: [new Cesium.CircleSymbolizer({ radius: 10, color: "color('red')" })],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyle
 */
class VectorStyleRule {
  /**
   * @param {VectorStyleRuleOptions} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.symbolizers", options.symbolizers);
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
     * @type {CircleSymbolizer[]}
     * @private
     */
    this._symbolizers = [...options.symbolizers];
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
   * How the selected features are drawn, in drawing order.
   *
   * @type {CircleSymbolizer[]}
   * @readonly
   */
  get symbolizers() {
    return this._symbolizers;
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
