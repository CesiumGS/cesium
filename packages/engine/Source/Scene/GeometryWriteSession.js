// @ts-check

import { DeveloperError } from "@cesium/core";
import GeometryReadSession from "./GeometryReadSession.js";
/** @import { TypedArray } from "@cesium/core"; */
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */

/**
 * Writes one vertex's value of an attribute. Get one from
 * {@link GeometryWriteSession#vertexAttributeWriter}.
 *
 * @callback GeometryAttributeWriter
 * @param {number} vertexIndex The index of the vertex to write.
 * @param {number[]|TypedArray} values The array with the attribute's {@link GeometryAttributeDescriptor#componentCount} values.
 * @param {number} [offset=0] The index in <code>values</code> of the first value.
 */

/**
 * Writes one corner's value of an attribute. Get one from
 * {@link GeometryWriteSession#cornerAttributeWriter}.
 *
 * @callback GeometryCornerAttributeWriter
 * @param {number} primitiveIndex The index of the primitive.
 * @param {number} cornerIndex The index of the corner within the primitive, in the order {@link GeometryPrimitiveReader} returns its vertices.
 * @param {number[]|TypedArray} values The array with the attribute's {@link GeometryAttributeDescriptor#componentCount} values.
 * @param {number} [offset=0] The index in <code>values</code> of the first value.
 */

/**
 * Read and write access to a geometry's vertices and primitives, staged by
 * {@link GeometryWriter#withWriteSession} and valid only until that callback
 * returns.
 * <p>
 * The session's readers see its writes immediately. The writes are applied to
 * the geometry when the callback returns.
 * </p>
 *
 * @interface
 * @extends GeometryReadSession
 *
 * @see GeometryWriter
 */
class GeometryWriteSession extends GeometryReadSession {
  /**
   * Creates a function that writes an attribute's value for a vertex.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to write. Must be one of the attributes requested for this session.
   * @returns {GeometryAttributeWriter} The attribute writer.
   *
   * @exception {DeveloperError} The attribute was not requested for this session.
   * @exception {DeveloperError} The attribute's domain isn't {@link GeometryAttributeDomain.VERTEX}.
   */
  vertexAttributeWriter(descriptor) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Creates a function that writes an attribute's value for a corner of a
   * primitive. Writing a vertex-domain attribute this way writes the corner's
   * vertex, which other corners may share.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to write. Must be one of the attributes requested for this session.
   * @returns {GeometryCornerAttributeWriter} The attribute writer.
   *
   * @exception {DeveloperError} The attribute was not requested for this session.
   * @exception {DeveloperError} Primitives were not requested for this session.
   */
  cornerAttributeWriter(descriptor) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Applies the session's writes to the geometry. Called by
   * {@link GeometryWriter#withWriteSession} when the callback returns.
   *
   * @internal
   */
  commit() {
    DeveloperError.throwInstantiationError();
  }
}

export default GeometryWriteSession;
