// @ts-check

import { Check, defined } from "@cesium/core";
import VectorPrimitiveGroup from "./VectorPrimitiveGroup.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import FeatureLayer from "./FeatureLayer.js"; */
/** @import SymbologyLayer from "./SymbologyLayer.js"; */
/** @import VectorPrimitive from "./VectorPrimitive.js"; */
/** @import VectorStyleRule from "./VectorStyleRule.js"; */

/**
 * @typedef {object} VectorStyleOptions
 * @property {VectorStyleRule[]} [rules] The rules of the style, in matching order.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * An ordered list of {@link VectorStyleRule} instances that decides how vector
 * features are drawn. Each feature is drawn by the first rule whose condition
 * it matches; features that match no rule are not drawn. The
 * {@link SymbologyLayer} instances of all rules are drawn in order of
 * {@link SymbologyLayer#zIndex}, then declaration order. Expressions read the
 * properties of each primitive's {@link BufferPrimitive#pickObject}, such as a
 * {@link Cesium3DTileFeature}.
 *
 * @example
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
 * // Halos of every rule are drawn below the circles of every rule.
 * const style = new Cesium.VectorStyle({
 *   rules: [
 *     new Cesium.VectorStyleRule({
 *       condition: "${type} === 'school'",
 *       symbologyLayers: [
 *         new Cesium.SymbologyLayer({
 *           name: "halos",
 *           zIndex: -1,
 *           symbolizers: [new Cesium.CircleSymbolizer({ radius: 12 })],
 *         }),
 *         new Cesium.SymbologyLayer({
 *           symbolizers: [
 *             new Cesium.CircleSymbolizer({ radius: 6, color: Cesium.Color.LIME }),
 *           ],
 *         }),
 *       ],
 *     }),
 *     new Cesium.VectorStyleRule({
 *       symbologyLayers: [
 *         new Cesium.SymbologyLayer({
 *           name: "halos",
 *           zIndex: -1,
 *           symbolizers: [new Cesium.CircleSymbolizer({ radius: 10 })],
 *         }),
 *         new Cesium.SymbologyLayer({
 *           symbolizers: [new Cesium.CircleSymbolizer({ radius: 4 })],
 *         }),
 *       ],
 *     }),
 *   ],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyleRule
 * @see SymbologyLayer
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
   * The rules of the style, in matching order.
   *
   * @type {VectorStyleRule[]}
   * @readonly
   */
  get rules() {
    return this._rules;
  }

  /**
   * Creates the vector primitives that draw a collection with this style. The
   * returned group holds one nested group per {@link SymbologyLayer}, in
   * drawing order, each named after its layer. A nested group holds one vector
   * primitive per symbolizer that applies to the collection, in symbolizer
   * order. The group is not added to the scene.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection The primitives to draw.
   * @returns {VectorPrimitiveGroup} The created vector primitives.
   */
  createPrimitives(collection) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("collection", collection);
    //>>includeEnd('debug');

    const rules = this._rules;
    /** @type {Array<{symbologyLayer: SymbologyLayer, ruleIndex: number}>} */
    const entries = [];
    for (let i = 0; i < rules.length; i++) {
      const symbologyLayers = rules[i].symbologyLayers;
      for (let j = 0; j < symbologyLayers.length; j++) {
        entries.push({ symbologyLayer: symbologyLayers.get(j), ruleIndex: i });
      }
    }
    // Array.prototype.sort is stable, so equal zIndex keeps declaration order.
    entries.sort((a, b) => a.symbologyLayer.zIndex - b.symbologyLayer.zIndex);

    const filters = rules.map((rule, i) => createRuleFilter(rules, i));
    const layerGroups = entries.map(
      ({ symbologyLayer, ruleIndex }) =>
        new VectorPrimitiveGroup({
          name: symbologyLayer.name,
          primitives: createLayerPrimitives(
            symbologyLayer,
            collection,
            filters[ruleIndex],
          ),
        }),
    );
    return new VectorPrimitiveGroup({ primitives: layerGroups });
  }

  /**
   * Draws the features of a {@link FeatureLayer} with this style. Features
   * loaded in tiles, as in a {@link Cesium3DTileset} or an
   * {@link MVTDataProvider}, are drawn as their tiles are selected. The style
   * is applied when each collection is first drawn; later changes to the
   * style are not applied.
   * <p>
   * Collections that no symbolizer applies to keep their default appearance.
   * </p>
   *
   * @param {FeatureLayer} featureLayer The layer to draw.
   * @returns {VectorPrimitiveGroup} The group to add to {@link Scene#primitives}. Destroying it restores the default appearance.
   *
   * @example
   * const layer = tileset.featureLayers.getByName("Roads")[0];
   * const vectors = viewer.scene.primitives.add(style.compile(layer));
   * vectors.show = false;
   */
  compile(featureLayer) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("featureLayer", featureLayer);
    //>>includeEnd('debug');

    const createCollections = featureLayer._createCollections;
    const collections = defined(createCollections) ? createCollections() : [];
    const group = new VectorPrimitiveGroup({
      name: featureLayer.name,
      primitives: collections.map((collection) =>
        this.createPrimitives(collection),
      ),
    });
    group._style = this;
    group._featureLayer = featureLayer;
    group._collections = collections;
    if (!defined(createCollections)) {
      featureLayer._vectorPrimitiveGroups.add(group);
    }
    return group;
  }
}

/**
 * @param {SymbologyLayer} symbologyLayer
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {undefined|function(BufferPrimitive): boolean} filter
 * @returns {VectorPrimitive[]}
 * @ignore
 */
function createLayerPrimitives(symbologyLayer, collection, filter) {
  const primitives = [];
  for (const symbolizer of symbologyLayer.symbolizers) {
    const primitive = symbolizer._createPrimitive(
      collection,
      filter,
      symbologyLayer.blendOption,
    );
    if (defined(primitive)) {
      primitives.push(primitive);
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
