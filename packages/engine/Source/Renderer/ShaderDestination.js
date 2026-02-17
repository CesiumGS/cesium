import Check from "../Core/Check.js";

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
 * Combine (union) two destinations.
 * For example: VERTEX + FRAGMENT => BOTH. If either is BOTH => BOTH.
 *
 * @param {ShaderDestination} left The left ShaderDestination
 * @param {ShaderDestination} right The right ShaderDestination
 * @return {ShaderDestination} The combined ShaderDestination
 * @private
 */
ShaderDestination.union = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("left", left);
  Check.typeOf.number("right", right);
  //>>includeEnd('debug');

  return left | right;
};

/**
 * Intersect two destinations.
 * For example: BOTH ∩ VERTEX => VERTEX. If either is undefined => NONE.
 *
 * @param {ShaderDestination} left The left ShaderDestination
 * @param {ShaderDestination} right The right ShaderDestination
 * @return {ShaderDestination} The intersected ShaderDestination
 * @private
 */
ShaderDestination.intersection = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("left", left);
  Check.typeOf.number("right", right);
  //>>includeEnd('debug');

  return left & right;
};

export default Object.freeze(ShaderDestination);
