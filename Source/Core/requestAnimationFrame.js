/*global define*/
define(function() {
    "use strict";

    /**
     * A browser-independent function to request a new animation frame.  This is used to create
     * an application's draw loop as shown in the example below.
     *
     * @exports requestAnimationFrame
     *
     * @param {Object} callback The function to call when animation is ready.
     *
     * @example
     * // Create a draw loop using requestAnimationFrame. The
     * // tick callback function is called for every animation frame.
     * function tick() {
     *   scene.render();
     *   requestAnimationFrame(tick);
     * }
     * tick();
     */
    var requestAnimationFrame = function(callback) {
        //delay the selection of the appropriate function until the first invocation
        requestAnimationFrame =
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(callback) {
                window.setTimeout(callback, 1000.0 / 60.0);
            };
        requestAnimationFrame(callback);
    };

    return requestAnimationFrame;
});
