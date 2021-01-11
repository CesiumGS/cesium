import RequestScheduler from "../Source/Core/RequestScheduler.js";
import Resource from "../Source/Core/Resource.js";
import when from "../Source/ThirdParty/when.js";

export function resetXHRPatch() {
  RequestScheduler.clearForSpecs();
  Resource._Implementations.loadWithXhr =
    Resource._DefaultImplementations.loadWithXhr;
}

export function patchXHRLoad(proxySpec) {
  // reset everything first; just in case
  resetXHRPatch();

  // override the method - basically add a proxy
  Resource._Implementations.loadWithXhr = function (
    url,
    responseType,
    method,
    data,
    headers,
    deferred,
    overrideMimeType
  ) {
    var sourceUrl = new URL(url, "https://google.com");
    var sourceUrlPath = sourceUrl.pathname + sourceUrl.search + sourceUrl.hash;

    if (!Object.keys(proxySpec).includes(sourceUrlPath)) {
      var msg =
        "Unexpected XHR load to url: " +
        sourceUrlPath +
        " (from url: " +
        url +
        "); spec includes: " +
        Object.keys(proxySpec).join(", ");
      console.error(msg);
      throw new Error(msg);
    }
    var targetUrl = proxySpec[sourceUrlPath];
    return Resource._DefaultImplementations.loadWithXhr(
      targetUrl,
      responseType,
      method,
      data,
      headers,
      deferred
    );
  };
}

function cacheToDisk(
  targetUrlPrefixStr,
  targetUrlStr,
  response,
  cacheToDiskPrefix
) {
  var targetPrefixUrl = new URL(targetUrlPrefixStr, "https://google.com");
  var targetUrl = new URL(targetUrlStr, "https://google.com");

  // strip the prefix from the target url
  // create file system path from the disk prefix + the remainder

  // var sourceUrlPath = sourceUrl.pathname + sourceUrl.search + sourceUrl.hash;
  console.log(
    "saving resource to disk",
    targetPrefixUrl,
    targetUrl,
    cacheToDiskPrefix
  );
}

export function setupXHRCache(targetUrlPrefix, cachePathPrefix) {
  // reset everything first; just in case
  resetXHRPatch();

  // override the method - basically add a proxy
  Resource._Implementations.loadWithXhr = function (
    url,
    responseType,
    method,
    data,
    headers,
    deferred,
    overrideMimeType
  ) {
    var wrappedDeferred = when.defer();
    var xhr = Resource._DefaultImplementations.loadWithXhr(
      url,
      responseType,
      method,
      data,
      headers,
      wrappedDeferred,
      overrideMimeType
    );

    wrappedDeferred.promise.then(
      function (response) {
        // slip in a little bit of code to cache the response!
        //  otherwise business as usual
        cacheToDisk(targetUrlPrefix, url, response, cachePathPrefix);
        deferred.resolve(response);
      },
      function (err) {
        deferred.reject(err);
      }
    );

    return xhr;
  };
}
