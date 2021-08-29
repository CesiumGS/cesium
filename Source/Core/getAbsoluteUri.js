import Uri from "../ThirdParty/Uri.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Given a relative Uri and a base Uri, returns the absolute Uri of the relative Uri.
 * @function
 *
 * @param {String} relative The relative Uri.
 * @param {String} [base] The base Uri.
 * @returns {String} The absolute Uri of the given relative Uri.
 *
 * @example
 * //absolute Uri will be "https://test.com/awesome.png";
 * var absoluteUri = Cesium.getAbsoluteUri('awesome.png', 'https://test.com');
 */
function getAbsoluteUri(relative, base) {
  var documentObject;
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
    base = defaultValue(documentObject.baseURI, documentObject.location.href);
  }

  var relativeUri = new Uri(relative);
  if (relativeUri.is("urn")) {
    return relativeUri.toString();
  }
  var url = relativeUri.absoluteTo(base).toString();
  // Uri.absoluteTo() escapes the placeholders. Undo that.
  url = url.replace(/%7B/g, "{").replace(/%7D/g, "}");
  return url;
};
export default getAbsoluteUri;
