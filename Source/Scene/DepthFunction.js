/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines the function used to compare two depths for the depth test.
     *
     * @namespace
     * @alias DepthFunction
     */
    var DepthFunction = {
        /**
         * 0x200.  The depth test never passes.
         *
         * @type {Number}
         * @constant
         */
        NEVER : 0x0200,

        /**
         * 0x201.  The depth test passes if the incoming depth is less than the stored depth.
         *
         * @type {Number}
         * @constant
         */
        LESS : 0x201,

        /**
         * 0x202.  The depth test passes if the incoming depth is equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        EQUAL : 0x0202,

        /**
         * 0x203.  The depth test passes if the incoming depth is less than or equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        LESS_OR_EQUAL : 0x203, // LEQUAL

        /**
         * 0x204.  The depth test passes if the incoming depth is greater than the stored depth.
         *
         * @type {Number}
         * @constant
         */
        GREATER : 0x0204,

        /**
         * 0x0205.  The depth test passes if the incoming depth is not equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        NOT_EQUAL : 0x0205, // NOTEQUAL

        /**
         * 0x206.  The depth test passes if the incoming depth is greater than or equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        GREATER_OR_EQUAL : 0x0206, // GEQUAL

        /**
         * 0x207.  The depth test always passes.
         *
         * @type {Number}
         * @constant
         */
        ALWAYS : 0x0207
    };

    return freezeObject(DepthFunction);
});
