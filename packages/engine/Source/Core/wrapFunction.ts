import DeveloperError from "./DeveloperError.js";

/**
 * Wraps a function on the provided objects with another function called in the
 * object's context so that the new function is always called immediately
 * before the old one.
 *
 * @private
 */
function wrapFunction(obj, oldFunction, newFunction) {
  ;

  return function () {
    newFunction.apply(obj, arguments);
    oldFunction.apply(obj, arguments);
  };
}
export { wrapFunction };
export default wrapFunction;
