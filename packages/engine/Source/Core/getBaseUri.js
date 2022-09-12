import Uri from "urijs";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Given a URI, returns the base path of the URI.
 * @function
 *
 * @param {String} uri The Uri.
 * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
 * @returns {String} The base path of the Uri.
 *
 * @example
 * // basePath will be "/Gallery/";
 * const basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false');
 *
 * // basePath will be "/Gallery/?value=true&example=false";
 * const basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false', true);
 */
function getBaseUri(uri, includeQuery) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.");
  }
  //>>includeEnd('debug');

  let basePath = "";
  const i = uri.lastIndexOf("/");
  if (i !== -1) {
    basePath = uri.substring(0, i + 1);
  }

  if (!includeQuery) {
    return basePath;
  }

  uri = new Uri(uri);
  if (uri.query().length !== 0) {
    basePath += `?${uri.query()}`;
  }
  if (uri.fragment().length !== 0) {
    basePath += `#${uri.fragment()}`;
  }

  return basePath;
}
export default getBaseUri;
