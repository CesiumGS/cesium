/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         * @default 0
         */
        ZERO : 0,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x1E00
         */
        KEEP : 0x1E00,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x1E01
         */
        REPLACE : 0x1E01,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x1E02
         */
        INCREMENT : 0x1E02, // WebGL: INCR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x1E03
         */
        DECREMENT : 0x1E03, // WebGL: DECR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x150A
         */
        INVERT : 0x150A,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8507
         */
        INCREMENT_WRAP : 0x8507, // WebGL: INCR_WRAP

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8508
         */
        DECREMENT_WRAP : 0x8508  // WebGL: DECR_WRAP
    };

    return StencilOperation;
});
