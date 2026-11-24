// @ts-check

import { DeveloperError } from "@cesium/core";
import GeometryReadSession from "./GeometryReadSession.js";
/** @import { TypedArray } from "@cesium/core"; */
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */

/**
 * Writes one element's value of an attribute. Get one from
 * {@link GeometryWriteSession#attributeWriter}.
 *
 * @callback GeometryAttributeWriter
 * @param {number} index The index of the element to write, in the attribute's domain.
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
   * Creates a function that writes an attribute's value for an element of its
   * domain, indexed as in {@link GeometryReadSession#attributeReader}.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to write. Must be one of the attributes requested for this session.
   * @returns {GeometryAttributeWriter} The attribute writer.
   *
   * @exception {DeveloperError} The attribute was not requested for this session.
   */
  attributeWriter(descriptor) {
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
