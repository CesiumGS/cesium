/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports StencilFunction
     */
    var StencilFunction = {
        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0200
         */
        NEVER : 0x0200,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0201
         */
        LESS : 0x0201,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0202
         */
        EQUAL : 0x0202,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0203
         */
        LESS_OR_EQUAL : 0x0203, // WebGL: LEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0204
         */
        GREATER : 0x0204,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0205
         */
        NOT_EQUAL : 0x0205, // WebGL: NOTEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0206
         */
        GREATER_OR_EQUAL : 0x0206, // WebGL: GEQUAL

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0207
         */
        ALWAYS : 0x0207
    };

    return StencilFunction;
});
