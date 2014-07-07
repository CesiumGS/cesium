/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines the function used to compare stencil values for the stencil test.
     *
     * @namespace
     * @alias StencilFunction
     */
    var StencilFunction = {
        /**
         * 0x0200. The stencil test never passes.
         *
         * @type {Number}
         * @constant
         */
        NEVER : 0x0200,

        /**
         * 0x0201.  The stencil test passes when the masked reference value is less than the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        LESS : 0x0201,

        /**
         * 0x0202.  The stencil test passes when the masked reference value is equal to the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        EQUAL : 0x0202,

        /**
         * 0x0203.  The stencil test passes when the masked reference value is less than or equal to the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        LESS_OR_EQUAL : 0x0203, // WebGL: LEQUAL

        /**
         * 0x0204.  The stencil test passes when the masked reference value is greater than the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        GREATER : 0x0204,

        /**
         * 0x0205.  The stencil test passes when the masked reference value is not equal to the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        NOT_EQUAL : 0x0205, // WebGL: NOTEQUAL

        /**
         * 0x0206.  The stencil test passes when the masked reference value is greater than or equal to the masked stencil value.
         *
         * @type {Number}
         * @constant
         */
        GREATER_OR_EQUAL : 0x0206, // WebGL: GEQUAL

        /**
         * 0x0207.  The stencil test always passes.
         *
         * @type {Number}
         * @constant
         */
        ALWAYS : 0x0207
    };

    return freezeObject(StencilFunction);
});
