// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import { TypedArray } from "@cesium/core"; */
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */
/** @import GeometryAttributeDomain from "./GeometryAttributeDomain.js"; */

/**
 * Reads one element's value of an attribute. Get one from
 * {@link GeometryReadSession#attributeReader}.
 *
 * @callback GeometryAttributeReader
 * @param {number} index The index of the element to read, in the attribute's domain.
 * @param {number[]|TypedArray} result The array to write the attribute's {@link GeometryAttributeDescriptor#componentCount} values into.
 * @param {number} [offset=0] The index in <code>result</code> at which to write the first value.
 * @returns {number[]|TypedArray} The result array.
 */

/**
 * Reads the vertex indices of one primitive, and optionally the index of the
 * edge from each of its vertices to the next. Get one from
 * {@link GeometryReadSession#primitiveReader}.
 *
 * @callback GeometryPrimitiveReader
 * @param {number} primitiveIndex The index of the primitive to read.
 * @param {number[]|TypedArray} result The array to write the {@link GeometryReadSession#primitiveVertexCount} vertex indices into.
 * @param {number} [offset=0] The index in <code>result</code> at which to write the first vertex index.
 * @param {number[]|TypedArray} [edgeResult] The array to write the {@link GeometryReadSession#primitiveVertexCount} edge indices into.
 * @param {number} [edgeOffset=0] The index in <code>edgeResult</code> at which to write the first edge index.
 * @returns {number[]|TypedArray} The result array.
 */

/**
 * Read access to a geometry's vertices and primitives, staged by
 * {@link GeometryReader#withReadSession} and valid only until that callback
 * returns.
 * <p>
 * A primitive is a point, line, or polygon made of 1, 2, or more vertices.
 * </p>
 * <p>
 * Attribute values are returned ready to use, regardless of how the geometry
 * stores them (e.g. compressed, encoded, etc). They're in the geometry's local space
 * and rest pose, and don't include node or instance transforms, skinning, morph targets,
 * or shader displacement.
 * </p>
 *
 * @interface
 *
 * @see GeometryReader
 */
class GeometryReadSession {
  constructor() {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "This type should not be instantiated directly. Instead, use GeometryReader#withReadSession.",
    );
    //>>includeEnd('debug');
  }

  /**
   * Gets the number of elements in a domain, e.g. the number of vertices for
   * {@link GeometryAttributeDomain.VERTEX}, or the number of primitives for
   * {@link GeometryAttributeDomain.FACE}.
   *
   * @param {GeometryAttributeDomain} domain The domain.
   * @returns {number} The number of elements.
   */
  elementCount(domain) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of vertices in a primitive: 1 for points, 2 for lines,
   * and 3 or more for polygons.
   *
   * @param {number} primitiveIndex The index of the primitive.
   * @returns {number} The number of vertices in the primitive.
   */
  primitiveVertexCount(primitiveIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets a function that reads the vertex indices of a primitive.
   *
   * @returns {GeometryPrimitiveReader} The primitive reader.
   *
   * @exception {DeveloperError} Primitives were not requested for this session.
   */
  primitiveReader() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Creates a function that reads an attribute's value for an element of its
   * domain. Elements are indexed by vertex, by corner in the order
   * {@link GeometryPrimitiveReader} returns them, by primitive, or by the edge
   * index {@link GeometryPrimitiveReader} returns.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to read. Must be one of the attributes requested for this session.
   * @returns {GeometryAttributeReader} The attribute reader.
   *
   * @exception {DeveloperError} The attribute was not requested for this session.
   */
  attributeReader(descriptor) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Frees the session's staged data. Called by
   * {@link GeometryReader#withReadSession} when the session ends.
   */
  destroy() {
    DeveloperError.throwInstantiationError();
  }
}

export default GeometryReadSession;
