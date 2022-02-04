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
    const availablePaths = Object.keys(proxySpec);
    let proxiedUrl;

    for (let i = 0; i < availablePaths.length; i++) {
      const srcPath = availablePaths[i];
      if (endsWith(url, srcPath)) {
        proxiedUrl = proxySpec[availablePaths[i]];
        break;
      }
    }

    // it's a whitelist - meaning you have to proxy every request explicitly
    if (!defined(proxiedUrl)) {
      throw new Error(
        `Unexpected XHR load to url: ${url}; spec includes: ${availablePaths.join(
          ", "
        )}`
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

export function patchXHRLoadForArcGISTerrainDataSet() {
  patchXHRLoad({
    "/?f=pjson": "Data/ArcGIS/9_214_379/root.json",
    "/tile/9/214/379": "Data/ArcGIS/9_214_379/tile_9_214_379.tile",
    "/tilemap/10/384/640/128/128":
      "Data/ArcGIS/9_214_379/tilemap_10_384_640_128_128.json",
    "/tilemap/9/128/256/128/128":
      "Data/ArcGIS/9_214_379/tilemap_9_128_256_128_128.json",
  });
}
