// @ts-check

import { RuntimeError, defined, oneTimeWarning } from "@cesium/core";
import { GeometryAttributeDomain } from "@cesium/engine";
import { Mesh as WasmMesh } from "@cesium/mesh-editor";
import WasmMeshAttributeTranslator from "./WasmMeshAttributeTranslator.js";

/** @import { GeometryAttributeDescriptor, GeometryReadSession, GeometrySource } from "@cesium/engine"; */

// Wasm takes these as per-vertex float buffers rather than custom attributes,
// and reserves their names.
const POSITION = "POSITION";
const NORMAL = "NORMAL";
const UV = "TEXCOORD_0";
const WASM_BUILT_IN_ATTRIBUTES = [POSITION, NORMAL, UV];

// Fills arrays before they're read into, to find entries the source didn't give.
const UNSET = 0xffffffff;

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

  const { indices, faceVertexCounts, edgeIndices, values } =
    reader.withReadSession({ attributes, primitives: true }, (session) =>
      readBuffers(session, attributes),
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
      edgeIndices,
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
 * Reads a session's primitives, each edge's vertices if any attribute is per
 * edge, and each attribute's values in the array type wasm takes.
 *
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor[]} attributes The attributes to read.
 * @returns {{ indices: Uint32Array, faceVertexCounts: Uint32Array, edgeIndices: Uint32Array|undefined, values: Map<string, Float32Array|Int32Array|Uint32Array> }} The primitives' vertex indices and sizes, two vertex indices per edge, and each attribute's values by name.
 * @ignore
 */
function readBuffers(session, attributes) {
  const hasEdgeAttributes = attributes.some(
    (descriptor) => descriptor.domain === GeometryAttributeDomain.EDGE,
  );

  const { indices, faceVertexCounts, primitiveEdges } = readPrimitives(
    session,
    hasEdgeAttributes,
  );

  const edgeIndices = hasEdgeAttributes
    ? readEdgeIndices(
        session,
        indices,
        faceVertexCounts,
        /** @type {Uint32Array} */ (primitiveEdges),
      )
    : undefined;

  const values = new Map();
  for (const descriptor of attributes) {
    values.set(descriptor.name, readAttributeValues(session, descriptor));
  }

  return { indices, faceVertexCounts, edgeIndices, values };
}

/**
 * Reads each primitive's vertex indices, and optionally its edge indices: the
 * edge from each of its vertices to the next.
 *
 * @param {GeometryReadSession} session The read session.
 * @param {boolean} withEdges Whether to read edge indices.
 * @returns {{ indices: Uint32Array, faceVertexCounts: Uint32Array, primitiveEdges: Uint32Array|undefined }} The primitives' vertex indices, sizes, and edge indices, with <code>UNSET</code> where the source didn't give one.
 * @ignore
 */
function readPrimitives(session, withEdges) {
  const primitiveCount = session.elementCount(GeometryAttributeDomain.FACE);
  const faceVertexCounts = new Uint32Array(primitiveCount);
  let indexCount = 0;

  for (let i = 0; i < primitiveCount; ++i) {
    faceVertexCounts[i] = session.primitiveVertexCount(i);
    indexCount += faceVertexCounts[i];
  }

  const indices = new Uint32Array(indexCount);
  const primitiveEdges = withEdges
    ? new Uint32Array(indexCount).fill(UNSET)
    : undefined;

  const readPrimitive = session.primitiveReader();
  let offset = 0;
  for (let i = 0; i < primitiveCount; ++i) {
    readPrimitive(i, indices, offset, primitiveEdges, offset);
    offset += faceVertexCounts[i];
  }

  return { indices, faceVertexCounts, primitiveEdges };
}

/**
 * Gets each edge's two vertices, from the first primitive it's in: the vertex
 * the edge starts from, and the next vertex in the primitive.
 *
 * @param {GeometryReadSession} session The read session.
 * @param {Uint32Array} indices The primitives' vertex indices.
 * @param {Uint32Array} faceVertexCounts The number of vertices in each primitive.
 * @param {Uint32Array} primitiveEdges The primitives' edge indices.
 * @returns {Uint32Array} Two vertex indices per edge, <code>UNSET</code> for edges that aren't in any primitive.
 * @ignore
 */
function readEdgeIndices(session, indices, faceVertexCounts, primitiveEdges) {
  const edgeCount = session.elementCount(GeometryAttributeDomain.EDGE);
  const edgeIndices = new Uint32Array(edgeCount * 2).fill(UNSET);

  let first = 0;
  for (const vertexCount of faceVertexCounts) {
    for (let i = 0; i < vertexCount; ++i) {
      const edge = primitiveEdges[first + i];

      if (edge !== UNSET && edgeIndices[edge * 2] === UNSET) {
        edgeIndices[edge * 2] = indices[first + i];
        edgeIndices[edge * 2 + 1] = indices[first + ((i + 1) % vertexCount)];
      }
    }
    first += vertexCount;
  }

  return edgeIndices;
}

/**
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor} descriptor An attribute.
 * @returns {Float32Array|Int32Array|Uint32Array} The values, in the order of the attribute's domain and the array type wasm takes.
 * @ignore
 */
function readAttributeValues(session, descriptor) {
  const ArrayType = WASM_BUILT_IN_ATTRIBUTES.includes(descriptor.name)
    ? Float32Array
    : WasmMeshAttributeTranslator.getArrayType(descriptor);
  const count = session.elementCount(descriptor.domain);
  const { componentCount } = descriptor;
  const values = new ArrayType(count * componentCount);
  const read = session.attributeReader(descriptor);

  for (let i = 0; i < count; ++i) {
    read(i, values, i * componentCount);
  }

  return values;
}

export default createWasmMesh;
