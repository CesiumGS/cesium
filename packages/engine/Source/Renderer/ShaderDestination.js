import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * A bit flag describing whether a variable should be added to the
 * vertex shader, the fragment shader, or both (or none).
 *
 * @private
 */
const ShaderDestination = {
  NONE: 0,
  VERTEX: 1,
  FRAGMENT: 2,
  BOTH: 3,
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination} destination The ShaderDestination to check
 * @return {boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.includesVertexShader = function (destination) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("destination", destination);
  //>>includeEnd('debug');

  return (destination & ShaderDestination.VERTEX) !== 0;
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination} destination The ShaderDestination to check
 * @return {boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.includesFragmentShader = function (destination) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("destination", destination);
  //>>includeEnd('debug');
  //

  return (destination & ShaderDestination.FRAGMENT) !== 0;
};

/**
 * Compute the union of multiple ShaderDestinations (e.g., VERTEX | FRAGMENT yields BOTH)
 * @param  {...ShaderDestination} destinations
 * @returns {ShaderDestination} The union of the provided destinations
 * @private
 */
ShaderDestination.union = function (...destinations) {
  //>>includeStart('debug', pragmas.debug);
  if (destinations.length === 0) {
    throw new DeveloperError(
      "ShaderDestination.union requires at least one destination.",
    );
  }
  //>>includeEnd('debug');

  let result = 0;
  for (let i = 0; i < destinations.length; i++) {
    result |= destinations[i];
  }
  return result;
};

/**
 * Compute the intersection of multiple ShaderDestinations (e.g., VERTEX & FRAGMENT yields NONE)
 * @param  {...ShaderDestination} destinations
 * @returns {ShaderDestination} The intersection of the provided destinations
 * @private
 */
ShaderDestination.intersection = function (...destinations) {
  //>>includeStart('debug', pragmas.debug);
  if (destinations.length === 0) {
    throw new DeveloperError(
      "ShaderDestination.intersection requires at least one destination.",
    );
  }
  //>>includeEnd('debug');

  let result = destinations[0];
  for (let i = 1; i < destinations.length; i++) {
    result &= destinations[i];
  }
  return result;
};

export default Object.freeze(ShaderDestination);
