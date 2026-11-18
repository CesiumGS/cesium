import { Check } from "@cesium/core";
import BufferPointCollection from "./BufferPointCollection.js";
import Expression from "./Expression.js";
import ModelVectorPrimitive from "./ModelVectorPrimitive.js";

/**
 * PROTOTYPE. Draws each point as a glTF model. Values may be expressions in the
 * 3D Tiles Styling language, evaluated against the point's feature.
 *
 * @example
 * new Cesium.VectorStyleRule({
 *   condition: "${MODEL} !== ''",
 *   symbolizers: [new Cesium.ModelSymbolizer({ uri: "${MODEL}" })],
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class ModelSymbolizer {
  /**
   * @param {object} options
   * @param {string} options.uri Expression giving the model URI. A relative URI is resolved against the content the feature was loaded from.
   * @param {number|string} [options.heading=0.0] Heading in radians, clockwise from north.
   * @param {number|string} [options.scale=1.0] Uniform scale.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.string("options.uri", options.uri);
    //>>includeEnd('debug');

    this._primitiveOptions = {
      uri: createEvaluator(options.uri),
      heading: createEvaluator(options.heading ?? 0.0),
      scale: createEvaluator(options.scale ?? 1.0),
    };
  }

  /**
   * @param {BufferPrimitiveCollection} collection
   * @param {function(BufferPrimitive): boolean} [filter]
   * @returns {ModelVectorPrimitive|undefined}
   * @ignore
   */
  _createPrimitive(collection, filter) {
    if (!(collection instanceof BufferPointCollection)) {
      return undefined;
    }
    return new ModelVectorPrimitive({
      ...this._primitiveOptions,
      collection,
      filter,
    });
  }
}

function createEvaluator(value) {
  if (typeof value !== "string") {
    return value;
  }
  const expression = new Expression(value);
  return (point) => expression.evaluate(point.pickObject);
}

export default ModelSymbolizer;
