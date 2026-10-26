// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */
/** @import GeometryReadSession from "./GeometryReadSession.js"; */

/**
 * The data a read session stages for reading.
 *
 * @typedef {object} GeometryReadSessionOptions
 * @property {GeometryAttributeDescriptor[]} [attributes=[]] The attributes to read.
 * @property {boolean} [primitives=false] Whether to read the vertex indices of the primitives.
 */

/**
 * Creates a read session that stages the requested data.
 *
 * @callback CreateGeometryReadSessionCallback
 * @param {Required<GeometryReadSessionOptions>} options The data to stage. All requested attributes are available.
 * @returns {GeometryReadSession} The new session.
 */

/**
 * Reads the vertices and primitives of a geometry, so geometry can be read
 * the same way regardless of which class owns it or how it is stored.
 * <p>
 * Data is read within a {@link GeometryReadSession}, which stages only the
 * requested attributes and frees them when the session ends. Classes that own
 * geometry implement {@link GeometryReadSession} and create a reader with it.
 * </p>
 *
 * @see GeometryReadSession
 * @see GeometryAttributeDescriptor
 */
class GeometryReader {
  #availableAttributes;
  #createReadSession;

  /**
   * @param {object} options Object with the following properties:
   * @param {GeometryAttributeDescriptor[]} options.availableAttributes The vertex attributes of the geometry.
   * @param {CreateGeometryReadSessionCallback} options.createReadSession Creates a session that stages the requested data.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.availableAttributes", options.availableAttributes);
    Check.typeOf.func("options.createReadSession", options.createReadSession);
    //>>includeEnd('debug');

    this.#availableAttributes = options.availableAttributes.slice();
    this.#createReadSession = options.createReadSession;
  }

  /**
   * Gets the vertex attributes of the geometry.
   *
   * @returns {GeometryAttributeDescriptor[]} The available attributes.
   */
  getAvailableAttributes() {
    return this.#availableAttributes.slice();
  }

  /**
   * Determines if the geometry has the given vertex attribute.
   *
   * @param {GeometryAttributeDescriptor} descriptor The attribute to look for.
   * @returns {boolean} <code>true</code> if the geometry has the attribute, <code>false</code> otherwise.
   */
  hasAttribute(descriptor) {
    return this.#availableAttributes.some((attribute) =>
      attribute.equals(descriptor),
    );
  }

  /**
   * Creates a read session for the requested data, invokes the callback with
   * it, then destroys the session, even if the callback throws.
   *
   * @template T
   * @param {GeometryReadSessionOptions} options The data to stage for reading.
   * @param {function(GeometryReadSession): T} callback The function that reads from the session.
   * @returns {T} The value returned by the callback.
   *
   * @exception {DeveloperError} A requested attribute is not available.
   * @exception {DeveloperError} A requested attribute's type doesn't match the available attribute.
   */
  withReadSession(options, callback) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.func("callback", callback);
    //>>includeEnd('debug');

    const { attributes = [], primitives = false } = options;

    //>>includeStart('debug', pragmas.debug);
    for (const descriptor of attributes) {
      const available = this.#availableAttributes.find((attribute) =>
        attribute.equals(descriptor),
      );

      const setIndex = defined(descriptor.setIndex)
        ? ` (set ${descriptor.setIndex})`
        : "";

      if (!defined(available)) {
        throw new DeveloperError(
          `Attribute ${descriptor.semantic}${setIndex} is not available.`,
        );
      }

      if (available.type !== descriptor.type) {
        throw new DeveloperError(
          `Attribute ${descriptor.semantic}${setIndex} has type ${available.type}, but ${descriptor.type} was requested.`,
        );
      }
    }
    //>>includeEnd('debug');

    const session = this.#createReadSession({ attributes, primitives });
    try {
      return callback(session);
    } finally {
      session.destroy();
    }
  }
}

export default GeometryReader;
