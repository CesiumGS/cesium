import Uri from "urijs";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Given a URI, returns the extension of the URI.
 * @function getExtensionFromUri
 *
 * @param {String} uri The Uri.
 * @returns {String} The extension of the Uri.
 *
 * @example
 * //extension will be "czml";
 * const extension = Cesium.getExtensionFromUri('/Gallery/simple.czml?value=true&example=false');
 */
function getExtensionFromUri(uri) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(uri)) {
    throw new DeveloperError("uri is required.");
  }
  //>>includeEnd('debug');

  const uriObject = new Uri(uri);
  uriObject.normalize();
  let path = uriObject.path();
  let index = path.lastIndexOf("/");
  if (index !== -1) {
    path = path.substr(index + 1);
  }
  index = path.lastIndexOf(".");
  if (index === -1) {
    path = "";
  } else {
    path = path.substr(index + 1);
  }
  return path;
}
export default getExtensionFromUri;
