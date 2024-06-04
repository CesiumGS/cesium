/**
 * Returns frozen renderState as well as all of the object literal properties. This function is deep object freeze
 * function ignoring properties named "_applyFunctions".
 *
 * @private
 *
 * @param {object} renderState
 * @returns {object} Returns frozen renderState.
 *
 */
function freezeRenderState(renderState) {
  if (typeof renderState !== "object" || renderState === null) {
    return renderState;
  }

  let propName;
  const propNames = Object.keys(renderState);

  for (let i = 0; i < propNames.length; i++) {
    propName = propNames[i];
    if (
      renderState.hasOwnProperty(propName) &&
      propName !== "_applyFunctions"
    ) {
      renderState[propName] = freezeRenderState(renderState[propName]);
    }
  }
  return Object.freeze(renderState);
}
export default freezeRenderState;
