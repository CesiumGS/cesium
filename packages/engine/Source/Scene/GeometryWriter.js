// @ts-check

import { Check } from "@cesium/core";
/** @import GeometryReader, { GeometryAccessOptions } from "./GeometryReader.js"; */
/** @import GeometryWriteSession from "./GeometryWriteSession.js"; */

/**
 * Writes the vertices of a geometry, so geometry can be written the same way
 * regardless of which class owns it or how it is stored.
 * <p>
 * Data is written within a {@link GeometryWriteSession}, which can also read
 * it. Classes that own geometry implement {@link GeometryWriteSession} and
 * create a writer with it.
 * </p>
 *
 * @see GeometryWriteSession
 * @see GeometryReader
 */
class GeometryWriter {
  #reader;
  #createWriteSession;

  /**
   * @param {object} options Object with the following properties:
   * @param {GeometryReader} options.reader The reader of the same geometry.
   * @param {function(Required<GeometryAccessOptions>): GeometryWriteSession} options.createWriteSession Creates a session that stages the requested data. All requested attributes are available.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.reader", options.reader);
    Check.typeOf.func("options.createWriteSession", options.createWriteSession);
    //>>includeEnd('debug');

    this.#reader = options.reader;
    this.#createWriteSession = options.createWriteSession;
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
   * @exception {DeveloperError} A requested attribute is not available, or doesn't match the available attribute.
   */
  withWriteSession(options, callback) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("callback", callback);
    //>>includeEnd('debug');

    return this.#reader._withSession(
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
