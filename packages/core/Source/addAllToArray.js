import defined from "./defined.js";

/**
 * Adds all elements from the given source array to the given target array.
 *
 * If the <code>source</code> is <code>null</code>, <code>undefined</code>,
 * or empty, then nothing will be done. Otherwise, this has the same
 * semantics as<br>
 * <code>for (const s of source) target.push(s);</code><br>
 * but is usually more efficient than a <code>for</code>-loop, and does not
 * put the elements of the source on the stack, as it would be done with the
 * spread operator or when using <code>target.push.apply(source)</code>.
 *
 * @function
 * @private
 *
 * @param {Array} target The target array
 * @param {Array|undefined} source The source array
 *
 * @example
 * const target = [ 0, 1, 2 ];
 * const source = [ 3, 4, 5 ];
 * Cesium.addAllToArray(target, source);
 * // The target is now [ 0, 1, 2, 3, 4, 5 ]
 */
function addAllToArray(target, source) {
  if (!defined(source)) {
    return;
  }
  const sourceLength = source.length;
  if (sourceLength === 0) {
    return;
  }
  const targetLength = target.length;
  target.length += sourceLength;
  for (let i = 0; i < sourceLength; i++) {
    target[targetLength + i] = source[i];
  }
}
export default addAllToArray;
