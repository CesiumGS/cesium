// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */
/** @import { GeometryAccessOptions } from "./GeometryReader.js"; */
/** @import GeometryReadSession from "./GeometryReadSession.js"; */

/**
 * Validates the requested data against the available attributes, creates a
 * session for it, invokes the callback with it, then destroys the session,
 * even if the callback throws.
 *
 * @template {GeometryReadSession} S
 * @template T
 * @param {GeometryAttributeDescriptor[]} availableAttributes The attributes that can be requested.
 * @param {GeometryAccessOptions} options The data to stage.
 * @param {function(Required<GeometryAccessOptions>): S} createSession Creates the session.
 * @param {function(S): T} callback The function that uses the session.
 * @returns {T} The value returned by the callback.
 *
 * @private
 */
function withGeometryAccessSession(
  availableAttributes,
  options,
  createSession,
  callback,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.func("callback", callback);
  //>>includeEnd('debug');

  const { attributes = [], primitives = false } = options;

  //>>includeStart('debug', pragmas.debug);
  for (const descriptor of attributes) {
    const available = availableAttributes.find((attribute) =>
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

    if (available.domain !== descriptor.domain) {
      throw new DeveloperError(
        `Attribute ${descriptor.semantic}${setIndex} has domain ${available.domain}, but ${descriptor.domain} was requested.`,
      );
    }

    if (
      defined(descriptor.componentDatatype) &&
      available.componentDatatype !== descriptor.componentDatatype
    ) {
      throw new DeveloperError(
        `Attribute ${descriptor.semantic}${setIndex} doesn't have the requested component datatype.`,
      );
    }
  }
  //>>includeEnd('debug');

  const session = createSession({ attributes, primitives });
  try {
    return callback(session);
  } finally {
    session.destroy();
  }
}

export default withGeometryAccessSession;
