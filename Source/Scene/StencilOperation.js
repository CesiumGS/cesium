/*global define*/
define([
        '../Core/freezeObject',
        '../Renderer/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    "use strict";

    /**
     * Determines the action taken based on the result of the stencil test.
     *
     * @namespace
     * @alias StencilOperation
     */
    var StencilOperation = {
        /**
         * Sets the stencil buffer value to zero.
         *
         * @type {Number}
         * @constant
         */
        ZERO : WebGLConstants.ZERO,

        /**
         * Does not change the stencil buffer.
         *
         * @type {Number}
         * @constant
         */
        KEEP : WebGLConstants.KEEP,

        /**
         * Replaces the stencil buffer value with the reference value.
         *
         * @type {Number}
         * @constant
         */
        REPLACE : WebGLConstants.REPLACE,

        /**
         * Increments the stencil buffer value, clamping to unsigned byte.
         *
         * @type {Number}
         * @constant
         */
        INCREMENT : WebGLConstants.INCR,

        /**
         * Decrements the stencil buffer value, clamping to zero.
         *
         * @type {Number}
         * @constant
         */
        DECREMENT : WebGLConstants.DECR,

        /**
         * Bitwise inverts the existing stencil buffer value.
         *
         * @type {Number}
         * @constant
         */
        INVERT : WebGLConstants.INVERT,

        /**
         * Increments the stencil buffer value, wrapping to zero when exceeding the unsigned byte range.
         *
         * @type {Number}
         * @constant
         */
        INCREMENT_WRAP : WebGLConstants.INCR_WRAP,

        /**
         * Decrements the stencil buffer value, wrapping to the maximum unsigned byte instead of going below zero.
         *
         * @type {Number}
         * @constant
         */
        DECREMENT_WRAP : WebGLConstants.DECR_WRAP
    };

    return freezeObject(StencilOperation);
});
