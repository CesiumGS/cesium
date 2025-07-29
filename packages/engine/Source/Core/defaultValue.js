import deprecationWarning from "./deprecationWarning.js";
import Frozen from "./Frozen.js";

/**
 * Returns the first parameter if not undefined, otherwise the second parameter.
 * Useful for setting a default value for a parameter.
 *
 * @function
 *
 * @param {*} a
 * @param {*} b
 * @returns {*} Returns the first parameter if not undefined, otherwise the second parameter.
 *
 * @example
 * param = Cesium.defaultValue(param, 'default');
 * @deprecated This function is deprecated and will be removed in Cesium 1.134. See <a href="https://github.com/CesiumGS/cesium/issues/11674">Issue 11674</a>.
 * Use the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing">Nullish coalescing operator</a> instead
 */
function defaultValue(a, b) {
  deprecationWarning(
    "defaultValue",
    `defaultValue has been deprecated and will be removed in Cesium 1.134. Use the nullish coalescing operator instead: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing`,
  );
  if (a !== undefined && a !== null) {
    return a;
  }
  return b;
}

/**
 * A frozen empty object that can be used as the default value for options passed as
 * an object literal.
 * @type {object}
 * @memberof defaultValue
 * @deprecated This property has been deprecated and will be removed in Cesium 1.134. See <a href="https://github.com/CesiumGS/cesium/issues/11326">Issue 11326</a>.
 * Use `Frozen.EMPTY_OBJECT` instead
 */
Object.defineProperty(defaultValue, "EMPTY_OBJECT", {
  get: function () {
    deprecationWarning(
      "defaultValue.EMPTY_OBJECT",
      "defaultValue.EMPTY_OBJECT has been deprecated and will be removed in Cesium 1.134. Use Frozen.EMPTY_OBJECT instead",
    );
    return Frozen.EMPTY_OBJECT;
  },
});

export default defaultValue;
