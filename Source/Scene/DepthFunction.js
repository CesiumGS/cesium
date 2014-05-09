/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports DepthFunction
     */
    var DepthFunction = {
        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x200
         */
        NEVER : 0x0200,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x201
         */
        LESS : 0x201,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x202
         */
        EQUAL : 0x0202,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x203
         */
        LESS_OR_EQUAL : 0x203, // LEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x204
         */
        GREATER : 0x0204,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x25
         */
        NOT_EQUAL : 0x0205, // NOTEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x206
         */
        GREATER_OR_EQUAL : 0x0206, // GEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x207
         */
        ALWAYS : 0x0207
    };

    return DepthFunction;
});
