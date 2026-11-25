// @ts-check

import { Check, defined } from "@cesium/core";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import VectorPrimitive from "./VectorPrimitive.js"; */
/** @import VectorStyleRule from "./VectorStyleRule.js"; */

/**
 * @typedef {object} VectorStyleOptions
 * @property {VectorStyleRule[]} [rules] The rules of the style, in order.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * An ordered list of {@link VectorStyleRule} instances that decides how vector
 * features are drawn. Each feature is drawn by the first rule whose condition
 * it matches; features that match no rule are not drawn. Expressions read the
 * properties of each primitive's {@link BufferPrimitive#pickObject}, such as a
 * {@link Cesium3DTileFeature}.
 *
 * @example
 * const style = new Cesium.VectorStyle();
 * style.addRule(
 *   new Cesium.VectorStyleRule({
 *     condition: "${population} > 1000000",
 *     symbolizers: [
 *       new Cesium.CircleSymbolizer({ radius: 10, color: "color('red')" }),
 *     ],
 *   }),
 * );
 * style.addRule(
 *   new Cesium.VectorStyleRule({
 *     symbolizers: [
 *       new Cesium.CircleSymbolizer({ radius: 3, color: Cesium.Color.GRAY }),
 *     ],
 *   }),
 * );
 *
 * for (const primitive of style.createPrimitives(collection)) {
 *   viewer.scene.primitives.add(primitive);
 * }
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyleRule
 */
class VectorStyle {
  /**
   * @param {VectorStyleOptions} [options]
   */
  constructor(options = {}) {
    /**
     * @type {VectorStyleRule[]}
     * @private
     */
    this._rules = [...(options.rules ?? [])];
  }

  /**
   * The rules of the style, in order.
   *
   * @type {VectorStyleRule[]}
   * @readonly
   */
  get rules() {
    return this._rules;
  }

  /**
   * Adds a rule after the existing rules. Primitives already created by the
   * style are not affected.
   *
   * @param {VectorStyleRule} rule The rule to add.
   */
  addRule(rule) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("rule", rule);
    //>>includeEnd('debug');

    this._rules.push(rule);
  }

  /**
   * Creates the vector primitives that draw a collection with this style, one
   * for each symbolizer that applies to the collection, in rule and symbolizer
   * order. The primitives are not added to the scene.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection The primitives to draw.
   * @returns {VectorPrimitive[]} The created vector primitives.
   */
  createPrimitives(collection) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("collection", collection);
    //>>includeEnd('debug');

    const rules = [...this._rules];
    const primitives = [];
    for (let i = 0; i < rules.length; i++) {
      const filter = createRuleFilter(rules, i);
      for (const symbolizer of rules[i].symbolizers) {
        const primitive = symbolizer._createPrimitive(collection, filter);
        if (defined(primitive)) {
          primitives.push(primitive);
        }
      }
    }
    return primitives;
  }
}

/**
 * Returns a filter that selects the primitives whose feature matches the rule
 * at the given index and no earlier rule.
 *
 * @param {VectorStyleRule[]} rules
 * @param {number} ruleIndex
 * @returns {undefined|function(BufferPrimitive): boolean}
 * @ignore
 */
function createRuleFilter(rules, ruleIndex) {
  if (ruleIndex === 0 && rules[0].condition === true) {
    return undefined;
  }

  return (primitive) => {
    const feature = primitive.pickObject;
    for (let i = 0; i < ruleIndex; i++) {
      if (rules[i]._matches(feature)) {
        return false;
      }
    }
    return rules[ruleIndex]._matches(feature);
  };
}

export default VectorStyle;
