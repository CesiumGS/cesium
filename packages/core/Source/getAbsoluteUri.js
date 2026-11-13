import Uri from "urijs";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Given a relative Uri and a base Uri, returns the absolute Uri of the relative Uri.
 * @function
 *
 * @param {string} relative The relative Uri.
 * @param {string} [base] The base Uri.
 * @returns {string} The absolute Uri of the given relative Uri.
 *
 * @example
 * //absolute Uri will be "https://test.com/awesome.png";
 * const absoluteUri = Cesium.getAbsoluteUri('awesome.png', 'https://test.com');
 */
function getAbsoluteUri(relative, base) {
  let documentObject;
  if (typeof document !== "undefined") {
    documentObject = document;
  }

  return getAbsoluteUri._implementation(relative, base, documentObject);
}

getAbsoluteUri._implementation = function (relative, base, documentObject) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(relative)) {
    throw new DeveloperError("relative uri is required.");
  }
  //>>includeEnd('debug');

  if (!defined(base)) {
    if (typeof documentObject === "undefined") {
      return relative;
    }
    base = documentObject.baseURI ?? documentObject.location.href;
  }

  const relativeUri = new Uri(relative);
  if (relativeUri.scheme() !== "") {
    return relativeUri.toString();
  }
  return relativeUri.absoluteTo(base).toString();
};
export default getAbsoluteUri;
