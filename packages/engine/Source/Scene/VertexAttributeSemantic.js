import Check from "../Core/Check.js";
import AttributeType from "./AttributeType.js";

/**
 * @typedef VertexAttributeSemantic
 * @property {string} semantic The understood attribute semantic value.
 * @property {string} propertyName The attribute semantic property name.
 * @property {AttributeType} accessorType Vertex attribute type for the corresponding semantic property.
 * @property {boolean} [hasSetIndex=false] If true, attribute semantic property name is of the form <code>[semantic]_[set_index]</code>, e.g., <code>TEXCOORD_0</code>, <code>TEXCOORD_1</code>, <code>COLOR_0</code>.
 * @property {boolean} [canQuantize=false] If true, this attribute could be quantized with <code>KHR_mesh_quantization</code> and need decoding as per {@link https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/README.md#extending-mesh-attributes|the KHR_mesh_quantization spec}
 */

/**
 * Per-vertex position.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const POSITION = Object.freeze({
  semantic: "POSITION",
  propertyName: "POSITION",
  type: AttributeType.VEC3,
  canQuantize: true
});

/**
 * Per-vertex normal.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const NORMAL = Object.freeze({
  semantic: "NORMAL",
  propertyName: "NORMAL",
  type: AttributeType.VEC3,
  canQuantize: true
});

/**
 * Per-vertex tangent.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const TANGENT = Object.freeze({
  semantic: "TANGENT",
  propertyName: "TANGENT",
  type: AttributeType.VEC3,
  canQuantize: true
});

/**
 * Per-vertex texture coordinates.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const TEXCOORD = Object.freeze({
  semantic: "TEXCOORD",
  propertyName: "TEXCOORD",
  type: AttributeType.VEC2,
  hasSetIndex: true,
  canQuantize: true
});

/**
 * Per-vertex color.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const COLOR = Object.freeze({
  semantic: "COLOR",
  propertyName: "COLOR",
  type: AttributeType.VEC4, // When VEC3, the 4th channel is assumed to be 1.0
  hasSetIndex: true,
});

/**
 * Per-vertex joint IDs for skinning.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const JOINTS = Object.freeze({
  semantic: "JOINTS",
  propertyName: "JOINTS",
  type: AttributeType.IVEC4,
  hasSetIndex: true,
});

/**
 * Per-vertex joint weights for skinning.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const WEIGHTS = Object.freeze({
  semantic: "WEIGHTS",
  propertyName: "WEIGHTS",
  type: AttributeType.VEC4,
  hasSetIndex: true,
});

/**
 * Vertex attribute semantic names and their associated properties as defined by the core glTF specification.
 * @type {Set<VertexAttributeSemantic>}
 * @private
 */
export const defaultGltfVertexAttributeSemantics = Object.freeze({
  POSITION,
  NORMAL,
  TANGENT,
  TEXCOORD,
  COLOR,
  JOINTS,
  WEIGHTS,
});

/**
 * Per-vertex feature ID.
 * @type {VertexAttributeSemantic}
 * @constant
 */
export const FEATURE_ID = Object.freeze({
  semantic: "FEATURE_ID",
  propertyName: "_FEATURE_ID",
  type: AttributeType.INT,
  hasSetIndex: true,
  canQuantize: true
});

/**
 * Returns <code>true</code> if the vertex attribute semantic property name, as defined in the <code>attributes</code> property of a glTF mesh, is understood to be the <code>POSITION</code> attribute.
 * @param {VertexAttributeSemantic} attributeSemantic The vertex attribute semantic.
 * @returns {boolean}  <code>true</code> if the vertex attribute semantic property name, as defined in the <code>attributes</code> property of a glTF mesh, is understood to be the <code>POSITION</code> attribute.
 * @private
 */
export function isPositionAttribute(attributeSemantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("attributeSemantic", attributeSemantic);
  Check.typeOf.string("attributeSemantic.propertyName", attributeSemantic.propertyName);
  //>>includeEnd('debug');

  return attributeSemantic.propertyName === POSITION.propertyName;
}

/**
 * Gets the vertex attribute semantic name corresponding to the vertex attribute semantic property name, as defined in the <code>attributes</code> property of a glTF mesh.
 * @param {string} propertyName The vertex attribute semantic property name.
 * @returns {string} The vertex attribute semantic name.
 * @private
 */
export function getSemanticNameFromPropertyName(propertyName) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyName", propertyName);
  //>>includeEnd('debug');

  const setIndexRegex = /^(\w+)_\d+$/;
  const setIndexMatch = setIndexRegex.exec(propertyName);
  if (setIndexMatch !== null) {
    return setIndexMatch[1];
  }

  return propertyName;
}

/**
 * Gets the vertex attribute set index corresponding to the vertex attribute semantic property name, as defined in the <code>attributes</code> property of a glTF mesh.
 * @param {string} propertyName The vertex attribute semantic property name.
 * @returns {number} The vertex attribute set index, or <code>0</code> if the property name contains no set index.
 * @private
 */
export function getSetIndexFromPropertyName(propertyName) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyName", propertyName);
  //>>includeEnd('debug');

  const setIndexRegex = /^\w+_(\d+)$/;
  const setIndexMatch = setIndexRegex.exec(propertyName);
  if (setIndexMatch !== null) {
    return parseInt(setIndexMatch[1]);
  }

  return 0;
}