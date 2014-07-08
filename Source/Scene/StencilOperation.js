/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines the action taken based on the result of the stencil test.
     *
     * @namespace
     * @alias StencilOperation
     */
    var StencilOperation = {
        /**
         * 0.  Sets the stencil buffer value to zero.
         *
         * @type {Number}
         * @constant
         */
        ZERO : 0,

        /**
         * 0x1E00.  Does not change the stencil buffer.
         *
         * @type {Number}
         * @constant
         */
        KEEP : 0x1E00,

        /**
         * 0x1E01.  Replaces the stencil buffer value with the reference value.
         *
         * @type {Number}
         * @constant
         */
        REPLACE : 0x1E01,

        /**
         * 0x1E02.  Increments the stencil buffer value, clamping to unsigned byte.
         *
         * @type {Number}
         * @constant
         */
        INCREMENT : 0x1E02, // WebGL: INCR

        /**
         * 0x1E03.  Decrements the stencil buffer value, clamping to zero.
         *
         * @type {Number}
         * @constant
         */
        DECREMENT : 0x1E03, // WebGL: DECR

        /**
         * 0x150A. Bitwise inverts the existing stencil buffer value.
         *
         * @type {Number}
         * @constant
         */
        INVERT : 0x150A,

        /**
         * 0x8507.  Increments the stencil buffer value, wrapping to zero when exceeding the unsigned byte range.
         *
         * @type {Number}
         * @constant
         */
        INCREMENT_WRAP : 0x8507, // WebGL: INCR_WRAP

        /**
         * 0x8508.  Decrements the stencil buffer value, wrapping to the maximum unsigned byte instead of going below zero.
         *
         * @type {Number}
         * @constant
         */
        DECREMENT_WRAP : 0x8508  // WebGL: DECR_WRAP
    };

    return freezeObject(StencilOperation);
});
