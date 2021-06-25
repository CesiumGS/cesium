/**
 * An enum describing whether a variable should be added to the
 * vertex shader, the fragment shader, or both.
 *
 * @private
 */
var ShaderDestination = {
  VERTEX: 0,
  FRAGMENT: 1,
  BOTH: 2,
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination}
 * @return {Boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.includesVertexShader = function (destination) {
  return (
    destination === ShaderDestination.VERTEX ||
    destination === ShaderDestination.BOTH
  );
};

/**
 * Check if a variable should be included in the vertex shader.
 *
 * @param {ShaderDestination}
 * @return {Boolean} <code>true</code> if the variable appears in the vertex shader, or <code>false</code> otherwise
 * @private
 */
ShaderDestination.incluesFragmentShader = function (destination) {
  return (
    destination === ShaderDestination.FRAGMENT ||
    destination === ShaderDestination.BOTH
  );
};

export default Object.freeze(ShaderDestination);
