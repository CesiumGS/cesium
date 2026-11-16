// @ts-check

import {
  AttributeType,
  ComponentDatatype,
  DeveloperError,
  defined,
} from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryAttributeDomain,
  VertexAttributeSemantic,
} from "@cesium/engine";
import {
  AttributeComponentType,
  AttributeDomain,
  CustomAttribute,
  VertsByAttributeResult,
} from "@cesium/mesh-editor";

/** @import { MeshAttribute } from "@cesium/mesh-editor"; */

/**
 * How wasm stores the values of one datatype.
 *
 * @typedef {object} Storage
 * @property {function(new:(Float32Array|Int32Array|Uint32Array), number)} ArrayType
 * @property {function(string, AttributeDomain, number, *): CustomAttribute} create
 * @ignore
 */

/** @type {Storage} */
const FLOAT32 = {
  ArrayType: Float32Array,
  create: (...args) => CustomAttribute.float32(...args),
};
/** @type {Storage} */
const INT32 = {
  ArrayType: Int32Array,
  create: (...args) => CustomAttribute.int32(...args),
};
/** @type {Storage} */
const UINT32 = {
  ArrayType: Uint32Array,
  create: (...args) => CustomAttribute.uint32(...args),
};

/** @type {Object<number, Storage>} */
const STORAGE = {
  [ComponentDatatype.FLOAT]: FLOAT32,
  [ComponentDatatype.BYTE]: INT32,
  [ComponentDatatype.SHORT]: INT32,
  [ComponentDatatype.INT]: INT32,
  [ComponentDatatype.UNSIGNED_BYTE]: UINT32,
  [ComponentDatatype.UNSIGNED_SHORT]: UINT32,
  [ComponentDatatype.UNSIGNED_INT]: UINT32,
};

// By component count, minus one.
const TYPES = [
  AttributeType.SCALAR,
  AttributeType.VEC2,
  AttributeType.VEC3,
  AttributeType.VEC4,
];

const WASM_DOMAINS = {
  [GeometryAttributeDomain.VERTEX]: AttributeDomain.Vertex,
  [GeometryAttributeDomain.CORNER]: AttributeDomain.Corner,
};

const DOMAINS = {
  [AttributeDomain.Vertex]: GeometryAttributeDomain.VERTEX,
  [AttributeDomain.Corner]: GeometryAttributeDomain.CORNER,
};

const DATATYPES = {
  [AttributeComponentType.Float32]: ComponentDatatype.FLOAT,
  [AttributeComponentType.Int32]: ComponentDatatype.INT,
  [AttributeComponentType.Uint32]: ComponentDatatype.UNSIGNED_INT,
};

/**
 * Translates attributes between {@link GeometryAttributeDescriptor}s and the
 * wasm mesh editor's attributes.
 *
 * @namespace WasmMeshAttributeTranslator
 * @private
 */
const WasmMeshAttributeTranslator = {};

/**
 * Gets why wasm can't store an attribute as a custom attribute.
 *
 * @param {GeometryAttributeDescriptor} descriptor The attribute.
 * @returns {string|undefined} The reason, or <code>undefined</code> if wasm can store it.
 */
WasmMeshAttributeTranslator.getUnsupportedReason = function (descriptor) {
  const { componentDatatype, type } = descriptor;
  if (!defined(STORAGE[componentDatatype])) {
    const actual =
      Object.entries(ComponentDatatype).find(
        ([, value]) => value === componentDatatype,
      )?.[0] ?? "none";
    return `expected component datatype FLOAT or an integer of 32 bits or fewer, but got ${actual}`;
  }
  if (!TYPES.includes(type)) {
    return `expected type SCALAR, VEC2, VEC3 or VEC4, but got ${type}`;
  }
  return undefined;
};

/**
 * Gets the array type wasm takes an attribute's values in.
 *
 * @param {GeometryAttributeDescriptor} descriptor A supported attribute.
 * @returns {function(new:(Float32Array|Int32Array|Uint32Array), number)} The array type.
 */
WasmMeshAttributeTranslator.getArrayType = function (descriptor) {
  return STORAGE[descriptor.componentDatatype].ArrayType;
};

/**
 * Creates a wasm custom attribute, named {@link GeometryAttributeDescriptor#name}.
 *
 * @param {GeometryAttributeDescriptor} descriptor A supported attribute.
 * @param {Float32Array|Int32Array|Uint32Array} values The values, in an array of the type {@link WasmMeshAttributeTranslator.getArrayType} gets.
 * @returns {CustomAttribute} The custom attribute.
 */
WasmMeshAttributeTranslator.createCustomAttribute = function (
  descriptor,
  values,
) {
  return STORAGE[descriptor.componentDatatype].create(
    descriptor.name,
    WASM_DOMAINS[descriptor.domain],
    descriptor.componentCount,
    values,
  );
};

/**
 * Creates a descriptor for an attribute listed by wasm.
 *
 * @param {MeshAttribute} attribute The wasm attribute.
 * @returns {GeometryAttributeDescriptor} The descriptor.
 */
WasmMeshAttributeTranslator.toDescriptor = function (attribute) {
  const { name, domain, componentType, componentCount } = attribute;

  // Built-in names end with their set index, if they have one.
  let semantic = name;
  let setIndex;
  const match = /^(.+)_(\d+)$/.exec(name);
  if (
    defined(match) &&
    /** @type {string[]} */ (Object.values(VertexAttributeSemantic)).includes(
      match[1],
    ) &&
    /** @type {any} */ (VertexAttributeSemantic).hasSetIndex(match[1])
  ) {
    semantic = match[1];
    setIndex = Number(match[2]);
  }

  return new GeometryAttributeDescriptor({
    semantic,
    setIndex,
    type: TYPES[componentCount - 1],
    domain: DOMAINS[domain],
    componentDatatype: DATATYPES[componentType],
  });
};

/**
 * Throws if a by-attribute operation on a mesh's vertices failed.
 *
 * @param {VertsByAttributeResult} result The operation's result.
 * @param {string} name The attribute's name.
 *
 * @exception {DeveloperError} The operation failed.
 */
WasmMeshAttributeTranslator.debugCheckVertsByAttributeResult = function (
  result,
  name,
) {
  //>>includeStart('debug', pragmas.debug);
  switch (result) {
    case VertsByAttributeResult.Ok:
      return;
    case VertsByAttributeResult.MeshInactive:
      throw new DeveloperError("The mesh isn't active.");
    case VertsByAttributeResult.AttributeNotFound:
      throw new DeveloperError(
        `The mesh has no per-vertex attribute named ${name}.`,
      );
    case VertsByAttributeResult.WrongType:
      throw new DeveloperError(
        `The value doesn't fit the type of attribute ${name}.`,
      );
    case VertsByAttributeResult.UnsupportedComparison:
      throw new DeveloperError(
        `The comparison doesn't apply to the type of attribute ${name}.`,
      );
  }
  //>>includeEnd('debug');
};

export default Object.freeze(WasmMeshAttributeTranslator);
