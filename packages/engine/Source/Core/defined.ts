/**
 * Returns whether the given value is defined (not undefined and not null).
 * This is a TypeScript type guard that narrows types properly in conditionals.
 *
 * @function
 *
 * @param {T | undefined | null} value The value to check.
 * @returns {value is T} Returns true if the value is defined, returns false otherwise.
 *
 * @example
 * if (Cesium.defined(positions)) {
 *      // TypeScript knows positions is defined here
 *      doSomething(positions);
 * } else {
 *      doSomethingElse();
 * }
 */
function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}
export default defined;
