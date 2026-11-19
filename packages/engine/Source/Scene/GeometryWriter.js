// @ts-check

import { Check } from "@cesium/core";
import withGeometryAccessSession from "./withGeometryAccessSession.js";
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */
/** @import { GeometryAccessOptions } from "./GeometryReader.js"; */
/** @import GeometryWriteSession from "./GeometryWriteSession.js"; */

/**
 * Writes the vertices of a geometry, so geometry can be written the same way
 * regardless of which class owns it or how it is stored.
 * <p>
 * Data is written within a {@link GeometryWriteSession}, which can also read
 * it. Classes that own geometry implement {@link GeometryWriteSession} and
 * create a writer with it. Some attributes may be readable, but may not support
 * writing (e.g. compressed ones).
 * </p>
 *
 * @see GeometryWriteSession
 * @see GeometryReader
 */
class GeometryWriter {
  #availableAttributes;
  #createWriteSession;

  /**
   * @param {object} options Object with the following properties:
   * @param {GeometryAttributeDescriptor[]} options.availableAttributes The vertex attributes of the geometry that can be written.
   * @param {function(Required<GeometryAccessOptions>): GeometryWriteSession} options.createWriteSession Creates a session that stages the requested data. All requested attributes are available.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.availableAttributes", options.availableAttributes);
    Check.typeOf.func("options.createWriteSession", options.createWriteSession);
    //>>includeEnd('debug');

    this.#availableAttributes = options.availableAttributes.slice();
    this.#createWriteSession = options.createWriteSession;
  }

  /**
   * Gets the vertex attributes of the geometry that can be written.
   *
   * @returns {GeometryAttributeDescriptor[]} The available attributes.
   */
  getAvailableAttributes() {
    return this.#availableAttributes.slice();
  }

  /**
   * Determines if the geometry has the given vertex attribute, and can write to it.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to look for.
   * @returns {boolean} <code>true</code> if the attribute can be written, <code>false</code> otherwise.
   */
  hasAttribute(descriptor) {
    return this.#availableAttributes.some((attribute) =>
      attribute.equals(descriptor),
    );
  }

  /**
   * Creates a write session for the requested data and invokes the callback
   * with it. Applies the writes if the callback returns, then destroys the
   * session, even if the callback throws.
   *
   * @template T
   * @param {GeometryAccessOptions} options The data to stage for reading and writing.
   * @param {function(GeometryWriteSession): T} callback The function that reads from and writes to the session.
   * @returns {T} The value returned by the callback.
   *
   * @exception {DeveloperError} A requested attribute can't be written, or doesn't match the available attribute.
   */
  withWriteSession(options, callback) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("callback", callback);
    //>>includeEnd('debug');

    return withGeometryAccessSession(
      this.#availableAttributes,
      options,
      this.#createWriteSession,
      (session) => {
        const result = callback(session);
        session.commit();
        return result;
      },
    );
  }
}

export default GeometryWriter;
