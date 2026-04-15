/** @import AttributeType from "../AttributeType.js"; */
/** @import Cartesian3 from "../../Core/Cartesian3.js"; */
/** @import Color from "../../Core/Color.js"; */
/** @import ComponentDatatype from "../../Core/ComponentDatatype.js"; */
/** @import PrimitiveType from "../../Core/PrimitiveType.js"; */

/**
 * The type information for a single attribute in a {@link GeometryResult}.
 *
 * @typedef {object} GeometryResult.AttributeTypeInfo
 * @property {string} type The attribute type (e.g. VEC3, VEC4, SCALAR).
 * @property {ComponentDatatype} componentDatatype The component data type (e.g. FLOAT, UNSIGNED_SHORT).
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

export default GeometryResult;
