// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import { TypedArray } from "@cesium/core"; */
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */

/**
 * Reads one vertex's value of an attribute. Get one from
 * {@link GeometryReadSession#vertexAttributeReader}.
 *
 * @callback GeometryAttributeReader
 * @param {number} vertexIndex The index of the vertex to read.
 * @param {number[]|TypedArray} result The array to write the attribute's {@link GeometryAttributeDescriptor#componentCount} values into.
 * @param {number} [offset=0] The index in <code>result</code> at which to write the first value.
 * @returns {number[]|TypedArray} The result array.
 */

/**
 * Reads the vertex indices of one primitive. Get one from
 * {@link GeometryReadSession#primitiveReader}.
 *
 * @callback GeometryPrimitiveReader
 * @param {number} primitiveIndex The index of the primitive to read.
 * @param {number[]|TypedArray} result The array to write the {@link GeometryReadSession#primitiveVertexCount} vertex indices into.
 * @param {number} [offset=0] The index in <code>result</code> at which to write the first vertex index.
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
   * Gets the number of vertices in the geometry.
   *
   * @returns {number} The number of vertices.
   */
  vertexCount() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of primitives in the geometry.
   *
   * @returns {number} The number of primitives.
   */
  primitiveCount() {
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
   * Creates a function that reads an attribute's value for a vertex.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to read. Must be one of the attributes requested for this session.
   * @returns {GeometryAttributeReader} The attribute reader.
   *
   * @exception {DeveloperError} The attribute was not requested for this session.
   */
  vertexAttributeReader(descriptor) {
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
