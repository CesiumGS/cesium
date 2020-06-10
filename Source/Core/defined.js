/**
 * @function
 * 判断值是否为<code>undefined</code>或<code>null</code>
 * @param {*} value The object.
 * @returns {Boolean} Returns true if the object is defined, returns false otherwise.
 * <br/>如果不等于<code>undefined</code>或<code>null</code>，返回true，否则返回false。
 * @example
 * if (Cesium.defined(positions)) {
 *      doSomething();
 * } else {
 *      doSomethingElse();
 * }
 */
function defined(value) {
  return value !== undefined && value !== null;
}
export default defined;
