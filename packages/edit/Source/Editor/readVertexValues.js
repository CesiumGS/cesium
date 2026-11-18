// @ts-check

/** @import { TypedArray } from "@cesium/core"; */
/** @import { GeometryAttributeDescriptor, GeometryReadSession } from "@cesium/engine"; */

/**
 * Reads every vertex's value of a per-vertex attribute into one array.
 *
 * @template {TypedArray} T
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor} descriptor A per-vertex attribute.
 * @param {function(new:T, number)} ArrayType The array type to read into.
 * @returns {T} The values, in vertex order.
 * @private
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

export default readVertexValues;
