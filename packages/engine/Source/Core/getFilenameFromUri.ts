import Uri from "urijs";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Given a URI, returns the last segment of the URI, removing any path or query information.
 * @function getFilenameFromUri
 *
 * @param {string} uri The Uri.
 * @returns {string} The last segment of the Uri.
 *
 * @example
 * //fileName will be"simple.czml";
 * const fileName = Cesium.getFilenameFromUri('/Gallery/simple.czml?value=true&example=false');
 */
function getFilenameFromUri(uri) {
  ;

  const uriObject = new Uri(uri);
  uriObject.normalize();
  let path = uriObject.path();
  const index = path.lastIndexOf("/");
  if (index !== -1) {
    path = path.substr(index + 1);
  }
  return path;
}
export { getFilenameFromUri };
export default getFilenameFromUri;
