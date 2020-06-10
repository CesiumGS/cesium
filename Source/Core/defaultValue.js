/**
 * Returns the first parameter if not undefined, otherwise the second parameter.
 * Useful for setting a default value for a parameter.
 * <br/>一般用于给参数设置默认值。当第一个参数不为<code>undefined</code>时，返回第一个参数，否则返回第二个参数。
 * @function
 *
 * @param {*} a
 * @param {*} b
 * @returns {*} Returns the first parameter if not undefined, otherwise the second parameter.
 * <br/>当第一个参数不为<code>undefined</code>时，返回第一个参数，否则返回第二个参数。
 *
 * @example
 * param = Cesium.defaultValue(param, 'default');
 */
function defaultValue(a, b) {
  if (a !== undefined && a !== null) {
    return a;
  }
  return b;
}

/**
 * A frozen empty object that can be used as the default value for options passed as
 * an object literal.
 * <br/>一个冻结对象，可用于<code>defaultValue()</code>的第二个参数来设置默认值。
 * @type {Object}
 * @memberof defaultValue
 */
defaultValue.EMPTY_OBJECT = Object.freeze({});

export default defaultValue;
