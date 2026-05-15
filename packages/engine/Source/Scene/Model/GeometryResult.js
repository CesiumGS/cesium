/** @import AttributeType from "../AttributeType.js"; */
/** @import Cartesian3 from "../../Core/Cartesian3.js"; */
/** @import Color from "../../Core/Color.js"; */
/** @import ComponentDatatype from "../../Core/ComponentDatatype.js"; */
/** @import PrimitiveType from "../../Core/PrimitiveType.js"; */

import { defined } from "@cesium/engine";

/**
 * The type information for a single attribute in a {@link GeometryResult}.
 *
 * @typedef {object} GeometryResult.AttributeTypeInfo
 * @property {string} type The attribute type (e.g. VEC3, VEC4, SCALAR).
 * @property {ComponentDatatype} componentDatatype The component data type (e.g. FLOAT, UNSIGNED_SHORT).
 */

/**
 * A predicate function used by {@link GeometryResult#filter} to decide whether
 * a vertex should be included in the filtered result.
 *
 * @callback GeometryResult.filterPredicate
 * @param {GeometryResult} geometry The geometry result being filtered.
 * @param {number} index The vertex index (in the range
 *   <code>[0, count * instances)</code>).
 * @returns {boolean} <code>true</code> to include the vertex.
 */

/**
 * Contains extracted geometry data for a single primitive of a model.
 * <p>
 * Attribute values are stored generically in maps keyed by semantic name,
 * following glTF conventions (e.g. <code>"POSITION"</code>, <code>"NORMAL"</code>,
 * <code>"COLOR_0"</code>, <code>"TEXCOORD_0"</code>, <code>"_FEATURE_ID_0"</code>).
 * </p>
 * <p>
 * Typed convenience methods are provided for common attributes.
 * For custom or less common attributes, use the generic
 * {@link GeometryResult#getAttributeValues} and
 * {@link GeometryResult#getAttributeType} accessors.
 * </p>
 *
 * @alias GeometryResult
 * @internalConstructor
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function GeometryResult() {
  /**
   * The names of all extracted attributes (e.g. <code>"POSITION"</code>,
   * <code>"NORMAL"</code>, <code>"_FEATURE_ID_0"</code>).
   * @type {string[]}
   */
  this.attributeNames = [];

  /**
   * A map from attribute name to its array of values.
   * <p>
   * The value type depends on the attribute: <code>Cartesian3[]</code> for
   * POSITION and NORMAL, <code>Color[]</code> for COLOR, <code>number[]</code>
   * for SCALAR attributes, etc.
   * </p>
   * @type {Map<string, Array>}
   */
  this.attributeValues = new Map();

  /**
   * A map from attribute name to its type information.
   * @type {Map<string, GeometryResult.AttributeTypeInfo>}
   */
  this.attributeTypes = new Map();

  /**
   * The vertex indices for the primitive, if extracted.
   * @type {number[]|undefined}
   */
  this.indices = undefined;

  /**
   * The primitive type (e.g. TRIANGLES, LINES, POINTS).
   * @type {PrimitiveType}
   */
  this.primitiveType = undefined;

  /**
   * The number of vertices per instance in the primitive.
   * @type {number}
   */
  this.count = 0;

  /**
   * The number of instances of this primitive.
   * @type {number}
   */
  this.instances = 0;
}

/**
 * Returns the extracted vertex positions, or <code>undefined</code> if
 * positions were not extracted.
 *
 * @returns {Cartesian3[]|undefined} The array of positions.
 */
GeometryResult.prototype.getPositions = function () {
  return this.attributeValues.get("POSITION");
};

/**
 * Returns the extracted vertex normals, or <code>undefined</code> if
 * normals were not extracted.
 *
 * @returns {Cartesian3[]|undefined} The array of normals.
 */
GeometryResult.prototype.getNormals = function () {
  return this.attributeValues.get("NORMAL");
};

/**
 * Returns the extracted vertex colors, or <code>undefined</code> if
 * colors were not extracted.
 *
 * @returns {Color[]|undefined} The array of colors.
 */
GeometryResult.prototype.getColors = function () {
  return (
    this.attributeValues.get("COLOR") ?? this.attributeValues.get("COLOR_0")
  );
};

/**
 * Returns the extracted per-vertex feature IDs, or <code>undefined</code> if
 * feature IDs were not extracted.
 *
 * @returns {number[]|undefined} The array of feature IDs.
 */
GeometryResult.prototype.getFeatureIds = function () {
  return (
    this.attributeValues.get("_FEATURE_ID") ??
    this.attributeValues.get("_FEATURE_ID_0")
  );
};

/**
 * Returns the values array for the attribute with the given name, or
 * <code>undefined</code> if it was not extracted.
 *
 * @param {string} name The attribute name (e.g. <code>"POSITION"</code>,
 *   <code>"TEXCOORD_0"</code>, <code>"_MY_PROPERTY"</code>).
 * @returns {Array|undefined} The values array.
 */
GeometryResult.prototype.getAttributeValues = function (name) {
  return this.attributeValues.get(name);
};

/**
 * Returns the type information for the attribute with the given name, or
 * <code>undefined</code> if it was not extracted.
 *
 * @param {string} name The attribute name.
 * @returns {GeometryResult.AttributeTypeInfo|undefined} The type information.
 */
GeometryResult.prototype.getAttributeType = function (name) {
  return this.attributeTypes.get(name);
};

/**
 * Returns a new {@link GeometryResult} containing only the vertices for which
 * <code>predicate</code> returns <code>true</code>, or <code>undefined</code>
 * if no vertices pass the filter.
 *
 * @param {GeometryResult.filterPredicate} predicate A function called for each
 *   vertex that returns <code>true</code> to include it in the result.
 * @returns {GeometryResult|undefined} A new GeometryResult with the filtered
 *   vertices, or <code>undefined</code> if none matched.
 */
GeometryResult.prototype.filter = function (predicate) {
  const result = new GeometryResult();
  result.primitiveType = this.primitiveType;
  for (const key of this.attributeNames) {
    const values = this.attributeValues.get(key);
    const outValues = [];
    for (let index = 0; index < this.count * this.instances; index++) {
      if (predicate(this, index)) {
        outValues.push(values[index]);
      }
    }
    if (outValues.length > 0) {
      result.count = outValues.length;
      result.instances = 1;
      result.attributeNames.push(key);
      result.attributeTypes.set(key, this.attributeTypes.get(key));
      result.attributeValues.set(key, outValues);
    }
  }
  if (result.count > 0) {
    return result;
  }
  return undefined;
};

/**
 * Filters each {@link GeometryResult} in a list using a predicate and returns
 * an array of the non-<code>undefined</code> results.
 *
 * @param {GeometryResult[]} geometryList The geometry results to filter.
 * @param {GeometryResult.filterPredicate} predicate A function called for each
 *   vertex that returns <code>true</code> to include it.
 * @returns {GeometryResult[]} The filtered geometry results.
 * @private
 */
function filterGeometryResultsByPredicate(geometryList, predicate) {
  const result = [];
  for (let i = 0; i < geometryList.length; i++) {
    const geometry = geometryList[i];
    const outGeometry = geometry.filter(predicate);
    if (defined(outGeometry)) {
      result.push(outGeometry);
    }
  }
  return result;
}

/**
 * Filters a list of {@link GeometryResult} instances to return the first one
 * that contains vertices matching the given feature ID. If
 * <code>featureId</code> is <code>undefined</code>, all vertices are included.
 *
 * @param {GeometryResult[]} geometryList The geometry results to search.
 * @param {number} featureId The feature ID to match.
 * @returns {GeometryResult|undefined} The first matching filtered result, or
 *   <code>undefined</code> if no vertices matched.
 */
GeometryResult.getGeometryResultByFeatureId = function (
  geometryList,
  featureId,
) {
  const geometries = filterGeometryResultsByPredicate(
    geometryList,
    (geometry, index) => {
      const featureIds = geometry.getFeatureIds();
      if (defined(featureIds)) {
        return featureId === featureIds[index];
      }
      return false;
    },
  );
  if (geometries.length > 0) {
    return geometries[0];
  }
  return undefined;
};

export default GeometryResult;
