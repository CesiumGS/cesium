/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @constant
         * @type {Enumeration}
         */
        NEVER : new Enumeration(0x0200, "NEVER"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LESS : new Enumeration(0x0201, "LESS"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        EQUAL : new Enumeration(0x0202, "EQUAL"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LESS_OR_EQUAL : new Enumeration(0x0203, "LEQUAL"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        GREATER : new Enumeration(0x0204, "GREATER"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NOT_EQUAL : new Enumeration(0x0205, "NOTEQUAL"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        GREATER_OR_EQUAL : new Enumeration(0x0206, "GEQUAL"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        ALWAYS : new Enumeration(0x0207, "ALWAYS")
    };

    return DepthFunction;
});