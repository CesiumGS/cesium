import Check from "../Core/Check.js";

/**
 * An enum describing whether a variable should be added to the
 * vertex shader, the fragment shader, or both.
 *
 * @private
 */
const ShaderDestination = {
  VERTEX: 0,
  FRAGMENT: 1,
  BOTH: 2,
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination} destination The ShaderDestination to check
 * @return {Boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.includesVertexShader = function (destination) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("destination", destination);
  //>>includeEnd('debug');

  return (
    destination === ShaderDestination.VERTEX ||
    destination === ShaderDestination.BOTH
  );
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination} destination The ShaderDestination to check
 * @return {Boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.includesFragmentShader = function (destination) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("destination", destination);
  //>>includeEnd('debug');
  //
  return (
    destination === ShaderDestination.FRAGMENT ||
    destination === ShaderDestination.BOTH
  );
};

export default Object.freeze(ShaderDestination);
