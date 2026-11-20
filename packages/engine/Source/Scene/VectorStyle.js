// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import SymbologyLayer from "./SymbologyLayer.js";
import VectorPrimitiveGroup from "./VectorPrimitiveGroup.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import VectorPrimitive from "./VectorPrimitive.js"; */
/** @import VectorStyleRule from "./VectorStyleRule.js"; */

/**
 * @typedef {object} VectorStyleOptions
 * @property {SymbologyLayer[]} [symbologyLayers] The layers of the style, in drawing order.
 * @property {VectorStyleRule[]} [rules] The rules of a style with a single {@link SymbologyLayer}. Must not be combined with <code>symbologyLayers</code>.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * An ordered list of {@link SymbologyLayer} instances that decides how vector
 * features are drawn. Later layers are drawn above earlier ones. Within a
 * layer, each feature is drawn by the first rule whose condition it matches;
 * features that match no rule of any layer are not drawn. Expressions read the
 * properties of each primitive's {@link BufferPrimitive#pickObject}, such as a
 * {@link Cesium3DTileFeature}.
 *
 * @example
 * // A style with a single layer.
 * const style = new Cesium.VectorStyle({
 *   rules: [
 *     new Cesium.VectorStyleRule({
 *       condition: "${population} > 1000000",
 *       symbolizers: [
 *         new Cesium.CircleSymbolizer({ radius: 10, color: "color('red')" }),
 *       ],
 *     }),
 *     new Cesium.VectorStyleRule({
 *       symbolizers: [
 *         new Cesium.CircleSymbolizer({ radius: 3, color: Cesium.Color.GRAY }),
 *       ],
 *     }),
 *   ],
 * });
 *
 * viewer.scene.primitives.add(style.createPrimitives(collection));
 *
 * @example
 * // Selected features are drawn above every other feature.
 * const style = new Cesium.VectorStyle({
 *   symbologyLayers: [
 *     new Cesium.SymbologyLayer({
 *       name: "features",
 *       rules: [
 *         new Cesium.VectorStyleRule({
 *           symbolizers: [new Cesium.CircleSymbolizer({ radius: 4 })],
 *         }),
 *       ],
 *     }),
 *     new Cesium.SymbologyLayer({
 *       name: "selection",
 *       rules: [
 *         new Cesium.VectorStyleRule({
 *           condition: "${selected} === true",
 *           symbolizers: [
 *             new Cesium.CircleSymbolizer({ radius: 8, color: Cesium.Color.RED }),
 *           ],
 *         }),
 *       ],
 *     }),
 *   ],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see SymbologyLayer
 * @see VectorStyleRule
 */
class VectorStyle {
  /**
   * @param {VectorStyleOptions} [options]
   */
  constructor(options = {}) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(options.symbologyLayers) && defined(options.rules)) {
      throw new DeveloperError(
        "options.symbologyLayers and options.rules cannot both be defined.",
      );
    }
    //>>includeEnd('debug');

    /**
     * @type {SymbologyLayer[]}
     * @private
     */
    this._symbologyLayers = defined(options.rules)
      ? [new SymbologyLayer({ rules: options.rules })]
      : [...(options.symbologyLayers ?? [])];
  }

  /**
   * The layers of the style, in drawing order.
   *
   * @type {SymbologyLayer[]}
   * @readonly
   */
  get symbologyLayers() {
    return this._symbologyLayers;
  }

  /**
   * Adds a layer above the existing layers. Primitives already created by the
   * style are not affected.
   *
   * @param {SymbologyLayer} symbologyLayer The layer to add.
   */
  addSymbologyLayer(symbologyLayer) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("symbologyLayer", symbologyLayer);
    //>>includeEnd('debug');

    this._symbologyLayers.push(symbologyLayer);
  }

  /**
   * Creates the vector primitives that draw a collection with this style. The
   * returned group holds one nested group per {@link SymbologyLayer}, in
   * drawing order, each named after its layer. A nested group holds one vector
   * primitive per symbolizer that applies to the collection, in rule and
   * symbolizer order. The group is not added to the scene.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection The primitives to draw.
   * @returns {VectorPrimitiveGroup} The created vector primitives.
   */
  createPrimitives(collection) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("collection", collection);
    //>>includeEnd('debug');

    const layerGroups = this._symbologyLayers.map(
      (symbologyLayer) =>
        new VectorPrimitiveGroup({
          name: symbologyLayer.name,
          primitives: createLayerPrimitives(symbologyLayer, collection),
        }),
    );
    return new VectorPrimitiveGroup({ primitives: layerGroups });
  }
}

/**
 * @param {SymbologyLayer} symbologyLayer
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @returns {VectorPrimitive[]}
 * @ignore
 */
function createLayerPrimitives(symbologyLayer, collection) {
  const rules = [...symbologyLayer.rules];
  const primitives = [];
  for (let i = 0; i < rules.length; i++) {
    const filter = createRuleFilter(rules, i);
    for (const symbolizer of rules[i].symbolizers) {
      const primitive = symbolizer._createPrimitive(
        collection,
        filter,
        symbologyLayer.blendOption,
      );
      if (defined(primitive)) {
        primitives.push(primitive);
      }
    }
  }
  return primitives;
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
