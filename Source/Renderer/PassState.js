/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias PassState
     * @constructor
     */
    var PassState = function() {
        /**
         * DOC_TBA
         *
         * @type Framebuffer
         */
        this.framebuffer = undefined;

        /**
         * DOC_TBA
         */
        this.blendingEnabled = undefined;
    };

    return PassState;
});