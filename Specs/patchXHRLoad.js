import RequestScheduler from "../Source/Core/RequestScheduler.js";
import Resource from "../Source/Core/Resource.js";
import { defined } from "../Source/Cesium.js";

export function resetXHRPatch() {
  RequestScheduler.clearForSpecs();
  Resource._Implementations.loadWithXhr =
    Resource._DefaultImplementations.loadWithXhr;
}

function endsWith(value, suffix) {
  return value.indexOf(suffix, value.length - suffix.length) >= 0;
}

export function patchXHRLoad(proxySpec) {
  // reset everything first; just in case
  resetXHRPatch();

  Resource._Implementations.loadWithXhr = function (
    url,
    responseType,
    method,
    data,
    headers,
    deferred,
    overrideMimeType
  ) {
    // find a key (source path) path in the spec which matches (ends with) the requested url
    var availablePaths = Object.keys(proxySpec);
    var proxiedUrl;

    for (var i = 0; i < availablePaths.length; i++) {
      var srcPath = availablePaths[i];
      if (endsWith(url, srcPath)) {
        proxiedUrl = proxySpec[availablePaths[i]];
        break;
      }
    }

    // it's a whitelist - meaning you have to proxy every request explicitly
    if (!defined(proxiedUrl)) {
      throw new Error(
        "Unexpected XHR load to url: " +
          url +
          "; spec includes: " +
          availablePaths.join(", ")
      );
    }

    // make a real request to the proxied path for the matching source path
    return Resource._DefaultImplementations.loadWithXhr(
      proxiedUrl,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    );
  };
}
