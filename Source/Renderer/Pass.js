/*global define*/
define(function() {
    "use strict";

    /**
     * The render pass for a command.
     * @exports Pass
     *
     * @see DrawCommand#pass
     */
    var Pass = {
        /**
         * The opaque color pass.
         *
         * @type {Number}
         * @constant
         */
        OPAQUE : 0,
        /**
         * The translucent color pass.
         *
         * @type {Number}
         * @constant
         */
        TRANSLUCENT : 1,
        /**
         * The overlay pass.
         *
         * @type {Number}
         * @constant
         */
        OVERLAY : 2
    };

    return Pass;
});