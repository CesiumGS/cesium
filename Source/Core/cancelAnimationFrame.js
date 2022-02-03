import defined from "./defined.js";

let implementation;
if (typeof cancelAnimationFrame !== "undefined") {
  implementation = cancelAnimationFrame;
}

(function () {
  // look for vendor prefixed function
  if (!defined(implementation) && typeof window !== "undefined") {
    const vendors = ["webkit", "moz", "ms", "o"];
    let i = 0;
    const len = vendors.length;
    while (i < len && !defined(implementation)) {
      implementation = window[`${vendors[i]}CancelAnimationFrame`];
      if (!defined(implementation)) {
        implementation = window[`${vendors[i]}CancelRequestAnimationFrame`];
      }
      ++i;
    }
  }

  // otherwise, assume requestAnimationFrame is based on setTimeout, so use clearTimeout
  if (!defined(implementation)) {
    implementation = clearTimeout;
  }
})();

/**
 * A browser-independent function to cancel an animation frame requested using {@link requestAnimationFrame}.
 *
 * @function cancelAnimationFrame
 *
 * @param {Number} requestID The value returned by {@link requestAnimationFrame}.
 *
 * @see {@link http://www.w3.org/TR/animation-timing/#the-WindowAnimationTiming-interface|The WindowAnimationTiming interface}
 */
function cancelAnimationFramePolyfill(requestID) {
  // we need this extra wrapper function because the native cancelAnimationFrame
  // functions must be invoked on the global scope (window), which is not the case
  // if invoked as Cesium.cancelAnimationFrame(requestID)
  implementation(requestID);
}
export default cancelAnimationFramePolyfill;
