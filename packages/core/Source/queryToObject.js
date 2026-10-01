import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Parses a query string into an object, where the keys and values of the object are the
 * name/value pairs from the query string, decoded. If a name appears multiple times,
 * the value in the object will be an array of values.
 * @function queryToObject
 *
 * @param {string} queryString The query string.
 * @returns {object} An object containing the parameters parsed from the query string.
 *
 *
 * @example
 * const obj = Cesium.queryToObject('key1=some%20value&key2=a%2Fb&key3=x&key3=y');
 * // obj will be:
 * // {
 * //   key1 : 'some value',
 * //   key2 : 'a/b',
 * //   key3 : ['x', 'y']
 * // }
 *
 * @see objectToQuery
 */
function queryToObject(queryString) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(queryString)) {
    throw new DeveloperError("queryString is required.");
  }
  //>>includeEnd('debug');

  const result = {};
  if (queryString === "") {
    return result;
  }
  const parts = queryString.replace(/\+/g, "%20").split(/[&;]/);
  for (let i = 0, len = parts.length; i < len; ++i) {
    const subparts = parts[i].split("=");

    const name = decodeURIComponent(subparts[0]);
    let value = subparts[1];
    if (defined(value)) {
      value = decodeURIComponent(value);
    } else {
      value = "";
    }

    const resultValue = result[name];
    if (typeof resultValue === "string") {
      // expand the single value to an array
      result[name] = [resultValue, value];
    } else if (Array.isArray(resultValue)) {
      resultValue.push(value);
    } else {
      result[name] = value;
    }
  }
  return result;
}
export default queryToObject;
