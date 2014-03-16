/*global define*/
define(function() {
    "use strict";

    /**
     * Determines if and how a glTF animation is looped.
     *
     * @alias ModelAnimationLoop
     * @enumeration
     *
     * @see ModelAnimationCollection#add
     */
    var ModelAnimationLoop = {
        /**
         * Play the animation once; do not loop it.
         *
         * @type {Number}
         * @constant
         * @default 0
         */
        NONE : 0,

        /**
         * Loop the animation playing it from the start immediately after it stops.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        REPEAT : 1,

        /**
         * Loop the animation.  First, playing it forward, then in reverse, then forward, and so on.
         *
         * @type {Number}
         * @constant
         * @default 2
         */
        MIRRORED_REPEAT : 2
    };

    return ModelAnimationLoop;
});