// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import SymbologyLayer from "./SymbologyLayer.js";
import SymbologyLayerCollection from "./SymbologyLayerCollection.js";
import VectorPrimitiveGroup from "./VectorPrimitiveGroup.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import FeatureLayer from "./FeatureLayer.js"; */
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
 * @see SymbologyLayerCollection
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
     * @type {SymbologyLayerCollection}
     * @private
     */
    this._symbologyLayers = new SymbologyLayerCollection(
      defined(options.rules)
        ? [new SymbologyLayer({ rules: options.rules })]
        : options.symbologyLayers,
    );
  }

  /**
   * The layers of the style, in drawing order.
   *
   * @type {SymbologyLayerCollection}
   * @readonly
   */
  get symbologyLayers() {
    return this._symbologyLayers;
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

    const symbologyLayers = this._symbologyLayers;
    const layerGroups = [];
    for (let i = 0; i < symbologyLayers.length; i++) {
      const symbologyLayer = symbologyLayers.get(i);
      layerGroups.push(
        new VectorPrimitiveGroup({
          name: symbologyLayer.name,
          primitives: createLayerPrimitives(symbologyLayer, collection),
        }),
      );
    }
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
