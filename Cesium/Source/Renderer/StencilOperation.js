/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports StencilOperation
     */
    var StencilOperation = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        ZERO : new Enumeration(0, "ZERO"), // ZERO

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        KEEP : new Enumeration(0x1E00, "KEEP"), // KEEP

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        REPLACE : new Enumeration(0x1E01, "REPLACE"), // REPLACE

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INCREMENT : new Enumeration(0x1E02, "INCREMENT"), // INCR

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DECREMENT : new Enumeration(0x1E03, "DECREMENT"), // DECR

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INVERT : new Enumeration(0x150A, "INVERT"), // INVERT

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INCREMENT_WRAP : new Enumeration(0x8507, "INCREMENT_WRAP"), // INCR_WRAP

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DECREMENT_WRAP : new Enumeration(0x8508, "DECREMENT_WRAP") // DECR_WRAP
    };

    return StencilOperation;
});