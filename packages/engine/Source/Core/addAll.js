import defined from "./defined.js";

/**
 * Adds all elements from the given source array to the given target array.
 *
 * If the `source` is `undefined`, then nothing will be done. Otherwise,
 * this has the same semantics as
 * ```
 * for (const s of source) target.push(s);
 * ```
 * but is usually more efficient than a `for`-loop, and does not put the
 * elements of the source on the stack, as it would be done with the
 * spread operator or when using `target.push.apply(source)`.
 *
 * @function
 * @private
 *
 * @param {Array|undefined} source The source array
 * @param {Array} target The target array
 *
 * @example
 * const target = [ 0, 1, 2 ];
 * const source = [ 3, 4, 5 ];
 * Cesium.addAll(source, target);
 * // The target is now [ 0, 1, 2, 3, 4, 5 ]
 */
function addAll(source, target) {
  if (!defined(source)) {
    return;
  }
  const s = source.length;
  if (s === 0) {
    return;
  }
  const t = target.length;
  target.length += s;
  for (let i = 0; i < s; i++) {
    target[t + i] = source[i];
  }
}
export default addAll;
