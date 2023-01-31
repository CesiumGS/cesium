import defined from "./defined.js";
import getTimestamp from "./getTimestamp.js";

var implementation;
if (typeof requestAnimationFrame !== "undefined") {
  implementation = requestAnimationFrame;
}

(function () {
  // look for vendor prefixed function
  if (!defined(implementation) && typeof window !== "undefined") {
    var vendors = ["webkit", "moz", "ms", "o"];
    var i = 0;
    var len = vendors.length;
    while (i < len && !defined(implementation)) {
      implementation = window[vendors[i] + "RequestAnimationFrame"];
      ++i;
    }
  }

  // build an implementation based on setTimeout
  if (!defined(implementation)) {
    var msPerFrame = 1000.0 / 60.0;
    var lastFrameTime = 0;
    implementation = function (callback) {
      var currentTime = getTimestamp();

      // schedule the callback to target 60fps, 16.7ms per frame,
      // accounting for the time taken by the callback
      var delay = Math.max(msPerFrame - (currentTime - lastFrameTime), 0);
      lastFrameTime = currentTime + delay;

      return setTimeout(function () {
        callback(lastFrameTime);
      }, delay);
    };
  }
})();

/**
 * A browser-independent function to request a new animation frame.  This is used to create
 * an application's draw loop as shown in the example below.
 *
 * @function requestAnimationFrame
 *
 * @param {requestAnimationFrameCallback} callback The function to call when the next frame should be drawn.
 * @returns {Number} An ID that can be passed to {@link cancelAnimationFrame} to cancel the request.
 *
 *
 * @example
 * // Create a draw loop using requestAnimationFrame. The
 * // tick callback function is called for every animation frame.
 * function tick() {
 *   scene.render();
 *   Cesium.requestAnimationFrame(tick);
 * }
 * tick();
 *
 * @see {@link https://www.w3.org/TR/html51/webappapis.html#animation-frames|The Web API Animation Frames interface}
 */
function requestAnimationFramePolyFill(callback) {
  // we need this extra wrapper function because the native requestAnimationFrame
  // functions must be invoked on the global scope (window), which is not the case
  // if invoked as Cesium.requestAnimationFrame(callback)
  return implementation(callback);
}

/**
 * A function that will be called when the next frame should be drawn.
 * @callback requestAnimationFrameCallback
 *
 * @param {Number} timestamp A timestamp for the frame, in milliseconds.
 */
export default requestAnimationFramePolyFill;
