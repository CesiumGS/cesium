/**
 * @private
 */
function loadAndExecuteScript(url: any) {
  const script = document.createElement("script");
  script.async = true;
  script.src = url;

  return new Promise((resolve: any, reject: any) => {
    if (window.crossOriginIsolated) {
      script.setAttribute("crossorigin", "anonymous");
    }

    const head = document.getElementsByTagName("head")[0];
    script.onload = function () {
      script.onload = undefined;
      head.removeChild(script);
      resolve();
    };
    script.onerror = function (e) {
      reject(e);
    };

    head.appendChild(script);
  });
}
export default loadAndExecuteScript;
