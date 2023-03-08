import Check from "./Check.js";

const dataUriRegex = /^data:/i;

/**
 * Determines if the specified uri is a data uri.
 *
 * @function isDataUri
 *
 * @param {string} uri The uri to test.
 * @returns {boolean} true when the uri is a data uri; otherwise, false.
 *
 * @private
 */
function isDataUri(uri) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("uri", uri);
  //>>includeEnd('debug');

  return dataUriRegex.test(uri);
}
export default isDataUri;
