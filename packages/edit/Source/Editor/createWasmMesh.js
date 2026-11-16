// @ts-check

import { RuntimeError, defined, oneTimeWarning } from "@cesium/core";
import { GeometryAttributeDomain } from "@cesium/engine";
import { Mesh as WasmMesh } from "@cesium/mesh-editor";
import WasmMeshAttributeTranslator from "./WasmMeshAttributeTranslator.js";

/** @import { TypedArray } from "@cesium/core"; */
/** @import { GeometryAttributeDescriptor, GeometryReadSession, GeometrySource } from "@cesium/engine"; */

// Wasm takes these as per-vertex float buffers rather than custom attributes,
// and reserves their names.
const POSITION = "POSITION";
const NORMAL = "NORMAL";
const UV = "TEXCOORD_0";
const WASM_BUILT_IN_ATTRIBUTES = [POSITION, NORMAL, UV];

/**
 * Reads a source's geometry and attributes into a new wasm mesh. Each
 * primitive becomes a face. Attributes wasm can't store are skipped with a
 * warning.
 *
 * @param {GeometrySource} source The geometry to read.
 * @returns {WasmMesh} The wasm mesh.
 * @exception {RuntimeError} The source's geometry can't be edited.
 * @private
 */
function createWasmMesh(source) {
  const reader = source.geometryReader;
  const attributes = getSupportedAttributes(reader.getAvailableAttributes());
  if (!attributes.some((descriptor) => descriptor.name === POSITION)) {
    throw new RuntimeError(
      "The geometry can't be edited: it has no per-vertex positions.",
    );
  }

  const { indices, faceVertexCounts, values } = reader.withReadSession(
    { attributes, primitives: true },
    (session) => readBuffers(session, attributes),
  );

  try {
    const customAttributes = attributes
      .filter(
        (descriptor) => !WASM_BUILT_IN_ATTRIBUTES.includes(descriptor.name),
      )
      .map((descriptor) =>
        WasmMeshAttributeTranslator.createCustomAttribute(
          descriptor,
          values.get(descriptor.name),
        ),
      );

    return WasmMesh.fromBuffers(
      /** @type {Float32Array} */ (values.get(POSITION)),
      indices,
      /** @type {Float32Array|undefined} */ (values.get(NORMAL)),
      /** @type {Float32Array|undefined} */ (values.get(UV)),
      faceVertexCounts,
      customAttributes,
    );
  } catch (error) {
    throw new RuntimeError(`The geometry can't be edited: ${error.message}`);
  }
}

/**
 * Gets the attributes wasm can store, warning about the rest.
 *
 * @param {GeometryAttributeDescriptor[]} available The source's attributes.
 * @returns {GeometryAttributeDescriptor[]} The supported attributes.
 * @ignore
 */
function getSupportedAttributes(available) {
  return available.filter((descriptor) => {
    const reason = WASM_BUILT_IN_ATTRIBUTES.includes(descriptor.name)
      ? getUnsupportedBuiltInReason(descriptor)
      : WasmMeshAttributeTranslator.getUnsupportedReason(descriptor);

    if (defined(reason)) {
      oneTimeWarning(
        `MeshEditor-skipped-attribute-${descriptor.name}`,
        `The mesh editor skipped attribute ${descriptor.name}: ${reason}.`,
      );
    }
    return !defined(reason);
  });
}

/**
 * @param {GeometryAttributeDescriptor} descriptor One of wasm's built-in attributes.
 * @returns {string|undefined} Why wasm can't take it, or <code>undefined</code> if it can.
 * @ignore
 */
function getUnsupportedBuiltInReason(descriptor) {
  const { domain } = descriptor;
  return domain === GeometryAttributeDomain.VERTEX
    ? undefined
    : `expected domain ${GeometryAttributeDomain.VERTEX}, but got ${domain}`;
}

/**
 * Reads a session's primitives, and each attribute's values in the array type
 * wasm takes.
 *
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor[]} attributes The attributes to read.
 * @returns {{ indices: Uint32Array, faceVertexCounts: Uint32Array, values: Map<string, Float32Array|Int32Array|Uint32Array> }} The primitives' vertex indices and sizes, and each attribute's values by name.
 * @ignore
 */
function readBuffers(session, attributes) {
  const primitiveCount = session.primitiveCount();
  const faceVertexCounts = new Uint32Array(primitiveCount);
  let indexCount = 0;
  for (let i = 0; i < primitiveCount; ++i) {
    faceVertexCounts[i] = session.primitiveVertexCount(i);
    indexCount += faceVertexCounts[i];
  }

  const indices = new Uint32Array(indexCount);
  const readPrimitive = session.primitiveReader();
  let offset = 0;
  for (let i = 0; i < primitiveCount; ++i) {
    readPrimitive(i, indices, offset);
    offset += faceVertexCounts[i];
  }

  const values = new Map();
  for (const descriptor of attributes) {
    const ArrayType = WASM_BUILT_IN_ATTRIBUTES.includes(descriptor.name)
      ? Float32Array
      : WasmMeshAttributeTranslator.getArrayType(descriptor);

    values.set(
      descriptor.name,
      descriptor.domain === GeometryAttributeDomain.VERTEX
        ? readVertexValues(session, descriptor, ArrayType)
        : readCornerValues(session, descriptor, ArrayType, faceVertexCounts),
    );
  }

  return { indices, faceVertexCounts, values };
}

/**
 * @template {TypedArray} T
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor} descriptor A per-vertex attribute.
 * @param {new (length: number) => T} ArrayType The array type to read into.
 * @returns {T} The values, in vertex order.
 * @ignore
 */
function readVertexValues(session, descriptor, ArrayType) {
  const vertexCount = session.vertexCount();
  const { componentCount } = descriptor;
  const values = new ArrayType(vertexCount * componentCount);
  const read = session.vertexAttributeReader(descriptor);
  for (let i = 0; i < vertexCount; ++i) {
    read(i, values, i * componentCount);
  }
  return values;
}

/**
 * @template {TypedArray} T
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor} descriptor An attribute.
 * @param {new (length: number) => T} ArrayType The array type to read into.
 * @param {Uint32Array} faceVertexCounts The number of corners in each primitive.
 * @returns {T} The values, in the order of the primitives' indices.
 * @ignore
 */
function readCornerValues(session, descriptor, ArrayType, faceVertexCounts) {
  const { componentCount } = descriptor;
  const values = new ArrayType(session.cornerCount() * componentCount);
  const read = session.cornerAttributeReader(descriptor);
  let offset = 0;
  for (
    let primitiveIndex = 0;
    primitiveIndex < faceVertexCounts.length;
    ++primitiveIndex
  ) {
    const cornerCount = faceVertexCounts[primitiveIndex];
    for (let cornerIndex = 0; cornerIndex < cornerCount; ++cornerIndex) {
      read(primitiveIndex, cornerIndex, values, offset);
      offset += componentCount;
    }
  }
  return values;
}

export default createWasmMesh;
