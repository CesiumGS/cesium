// @ts-check

/** @import { TypedArray } from "@cesium/core"; */
/** @import { GeometryAttributeDescriptor, GeometryReadSession } from "@cesium/engine"; */

/**
 * Reads every value of an attribute into one array, in the order of the
 * attribute's domain.
 *
 * @template {TypedArray} T
 * @param {GeometryReadSession} session The read session.
 * @param {GeometryAttributeDescriptor} descriptor The attribute.
 * @param {function(new:T, number)} ArrayType The array type to read into.
 * @returns {T} The values.
 * @private
 */
function readAttributeValues(session, descriptor, ArrayType) {
  const count = session.elementCount(descriptor.domain);
  const { componentCount } = descriptor;
  const values = new ArrayType(count * componentCount);
  const read = session.attributeReader(descriptor);
  for (let i = 0; i < count; ++i) {
    read(i, values, i * componentCount);
  }
  return values;
}

export default readAttributeValues;
