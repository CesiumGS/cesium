/**
 * @private
 */
function loadAndExecuteScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = url;

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
