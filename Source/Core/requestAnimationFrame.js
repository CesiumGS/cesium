/*global define*/
define([
        './defined',
        './getTimestamp'
    ], function(
        defined,
        getTimestamp) {
    "use strict";

    if (typeof window === 'undefined') {
        return;
    }

    var implementation = window.requestAnimationFrame;

    (function() {
        // look for vendor prefixed function
        if (!defined(implementation)) {
            var vendors = ['webkit', 'moz', 'ms', 'o'];
            var i = 0;
            var len = vendors.length;
            while (i < len && !defined(implementation)) {
                implementation = window[vendors[i] + 'RequestAnimationFrame'];
                ++i;
            }
        }

        // build an implementation based on setTimeout
        if (!defined(implementation)) {
            var msPerFrame = 1000.0 / 60.0;
            var lastFrameTime = 0;
            implementation = function(callback) {
                var currentTime = getTimestamp();

                // schedule the callback to target 60fps, 16.7ms per frame,
                // accounting for the time taken by the callback
                var delay = Math.max(msPerFrame - (currentTime - lastFrameTime), 0);
                lastFrameTime = currentTime + delay;

                return setTimeout(function() {
                    callback(lastFrameTime);
                }, delay);
            };
        }
    })();

    /**
     * A browser-independent function to request a new animation frame.  This is used to create
     * an application's draw loop as shown in the example below.
     *
     * @exports requestAnimationFrame
     *
     * @param {requestAnimationFrame~Callback} callback The function to call when the next frame should be drawn.
     * @returns An ID that can be passed to {@link cancelAnimationFrame} to cancel the request.
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
     * @see {@link http://www.w3.org/TR/animation-timing/#the-WindowAnimationTiming-interface|The WindowAnimationTiming interface}
     */
    function requestAnimationFrame(callback) {
        // we need this extra wrapper function because the native requestAnimationFrame
        // functions must be invoked on the global scope (window), which is not the case
        // if invoked as Cesium.requestAnimationFrame(callback)
        return implementation(callback);
    }

    /**
     * A function that will be called when the next frame should be drawn.
     * @callback requestAnimationFrame~Callback
     *
     * @param {Number} timestamp A timestamp for the frame, in milliseconds.
     */

    return requestAnimationFrame;
});
