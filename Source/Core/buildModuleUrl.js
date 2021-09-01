import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import getAbsoluteUri from "./getAbsoluteUri.js";
import Resource from "./Resource.js";

/*global CESIUM_BASE_URL*/

var cesiumScriptRegex = /((?:.*\/)|^)Cesium\.js(?:\?|\#|$)/;
function getBaseUrlFromCesiumScript() {
  var scripts = document.getElementsByTagName("script");
  for (var i = 0, len = scripts.length; i < len; ++i) {
    var src = scripts[i].getAttribute("src");
    var result = cesiumScriptRegex.exec(src);
    if (result !== null) {
      return result[1];
    }
  }
  return undefined;
}

var a;
function tryMakeAbsolute(url) {
  if (typeof document === "undefined") {
    //Node.js and Web Workers. In both cases, the URL will already be absolute.
    return url;
  }

  if (!defined(a)) {
    a = document.createElement("a");
  }
  a.href = url;

  // IE only absolutizes href on get, not set
  // eslint-disable-next-line no-self-assign
  a.href = a.href;
  return a.href;
}

var baseResource;
function getCesiumBaseUrl() {
  if (defined(baseResource)) {
    return baseResource;
  }

  var baseUrlString;
  if (typeof CESIUM_BASE_URL !== "undefined") {
    baseUrlString = CESIUM_BASE_URL;
  } else if (
    typeof define === "object" &&
    defined(define.amd) &&
    !define.amd.toUrlUndefined &&
    defined(require.toUrl)
  ) {
    baseUrlString = getAbsoluteUri(
      "..",
      buildModuleUrl("Core/buildModuleUrl.js")
    );
  } else {
    baseUrlString = getBaseUrlFromCesiumScript();
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(baseUrlString)) {
    throw new DeveloperError(
      "Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL."
    );
  }
  //>>includeEnd('debug');

  baseResource = new Resource({
    url: tryMakeAbsolute(baseUrlString),
  });
  baseResource.appendForwardSlash();

  return baseResource;
}

function buildModuleUrlFromRequireToUrl(moduleID) {
  //moduleID will be non-relative, so require it relative to this module, in Core.
  return tryMakeAbsolute(require.toUrl("../" + moduleID));
}

function buildModuleUrlFromBaseUrl(moduleID) {
  var resource = getCesiumBaseUrl().getDerivedResource({
    url: moduleID,
  });
  return resource.url;
}

var implementation;

/**
 * Given a relative URL under the Cesium base URL, returns an absolute URL.
 * @function buildModuleUrl
 *
 * @param {String} relativeUrl The relative path.
 * @returns {String} The absolutely URL representation of the provided path.
 *
 * @example
 * var viewer = new Cesium.Viewer("cesiumContainer", {
 *   imageryProvider: new Cesium.TileMapServiceImageryProvider({
 *   url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
 *   }),
 *   baseLayerPicker: false,
 * });
 */
function buildModuleUrl(relativeUrl) {
  if (!defined(implementation)) {
    //select implementation
    if (
      typeof define === "object" &&
      defined(define.amd) &&
      !define.amd.toUrlUndefined &&
      defined(require.toUrl)
    ) {
      implementation = buildModuleUrlFromRequireToUrl;
    } else {
      implementation = buildModuleUrlFromBaseUrl;
    }
  }

  var url = implementation(relativeUrl);
  return url;
}

// exposed for testing
buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
buildModuleUrl._clearBaseResource = function () {
  baseResource = undefined;
};

/** @namespace buildModuleUrl(1) */

/**
 * Sets the base URL for resolving modules.
 * @function setBaseUrl
 * @memberof buildModuleUrl(1)
 * @param {String} value The new base URL.
 * @return {Void} void
 */
buildModuleUrl.setBaseUrl = function (value) {
  baseResource = Resource.DEFAULT.getDerivedResource({
    url: value,
  });
};

/**
 * Gets the base URL for resolving modules.
 * @function getCesiumBaseUrl
 * @memberof buildModuleUrl(1)
 * @return {Resource} The base URL for resolving modules.
 */
buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;

export default buildModuleUrl;
