import defer from "./defer.js";

/**
 * @private
 */
function loadAndExecuteScript(url) {
  const deferred = defer();
  const script = document.createElement("script");
  script.async = true;
  script.src = url;

  if (window.crossOriginIsolated) {
    script.setAttribute("crossorigin", "anonymous");
  }

  const head = document.getElementsByTagName("head")[0];
  script.onload = function () {
    script.onload = undefined;
    head.removeChild(script);
    deferred.resolve();
  };
  script.onerror = function (e) {
    deferred.reject(e);
  };

  head.appendChild(script);

  return deferred.promise;
}
export default loadAndExecuteScript;
