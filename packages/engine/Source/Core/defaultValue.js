import EmptyObject from "./EmptyObject.js";
import deprecationWarning from "./deprecationWarning.js";

/**
 * Returns the first parameter if not undefined, otherwise the second parameter.
 * Useful for setting a default value for a parameter.
 * @function
 *
 * @param {*} a
 * @param {*} b
 * @returns {*} Returns the first parameter if not undefined, otherwise the second parameter.
 *
 * @example
 * param = Cesium.defaultValue(param, 'default');
 *
 * @property {object} EMPTY_OBJECT - DEPRECATED (use EmptyObject). <br>
 * A frozen empty object that can be used as the default value for options passed as an object literal.
 */
function defaultValue(a, b) {
  if (a !== undefined && a !== null) {
    return a;
  }
  return b;
}

/**
 * @type {object}
 * @constant
 * @deprecated This property is deprecated and will be removed in Cesium 1.125. See <a href="https://github.com/CesiumGS/cesium/issues/11326">Issue 113216</a>
 */
Object.defineProperty(defaultValue, "EMPTY_OBJECT", {
  get: function () {
    deprecationWarning(
      "defaultValue.EMPTY_OBJECT",
      "defaultValue.EMPTY_OBJECT is deprecated and will be removed in Cesium 1.125. See https://github.com/CesiumGS/cesium/issues/11326",
    );
    return EmptyObject;
  },
  configurable: false,
});

export default defaultValue;
