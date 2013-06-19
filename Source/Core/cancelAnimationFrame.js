/*global define*/
define(function() {
    "use strict";

    var implementation = window.cancelAnimationFrame;
    (function() {
        // look for vendor prefixed function
        if (typeof implementation === 'undefined') {
            var vendors = ['webkit', 'moz', 'ms', 'o'];
            var i = 0;
            var len = vendors.length;
            while (i < len && typeof implementation === 'undefined') {
                implementation = window[vendors[i] + 'CancelAnimationFrame'];
                if (typeof implementation === 'undefined') {
                    implementation = window[vendors[i] + 'CancelRequestAnimationFrame'];
                }
                ++i;
            }
        }

        // otherwise, assume requestAnimationFrame is based on setTimeout, so use clearTimeout
        if (typeof implementation === 'undefined') {
            implementation = clearTimeout;
        }
    })();

    /**
     * A browser-independent function to cancel an animation frame requested using @{link requestAnimationFrame}.
     *
     * @exports cancelAnimationFrame
     *
     * @param requestID The value returned by @{link requestAnimationFrame}.
     *
     * @see <a href='http://www.w3.org/TR/animation-timing/#the-WindowAnimationTiming-interface'>The WindowAnimationTiming interface</a>
     */
    var cancelAnimationFrame = function(requestID) {
        // we need this extra wrapper function because the native cancelAnimationFrame
        // functions must be invoked on the global scope (window), which is not the case
        // if invoked as Cesium.cancelAnimationFrame(requestID)
        implementation(requestID);
    };

    return cancelAnimationFrame;
});