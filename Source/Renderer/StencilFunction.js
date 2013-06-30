/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0x0200
         */
        NEVER : new Enumeration(0x0200, 'NEVER'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0201
         */
        LESS : new Enumeration(0x0201, 'LESS'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0202
         */
        EQUAL : new Enumeration(0x0202, 'EQUAL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0203
         */
        LESS_OR_EQUAL : new Enumeration(0x0203, 'LESS_OR_EQUAL'), // WebGL: LEQUAL

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0204
         */
        GREATER : new Enumeration(0x0204, 'GREATER'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0205
         */
        NOT_EQUAL : new Enumeration(0x0205, 'NOT_EQUAL'), // WebGL: NOTEQUAL

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0206
         */
        GREATER_OR_EQUAL : new Enumeration(0x0206, 'GREATER_OR_EQUAL'), // WebGL: GEQUAL

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0207
         */
        ALWAYS : new Enumeration(0x0207, 'ALWAYS'),

        /**
         * DOC_TBA
         *
         * @param {StencilFunction} stencilFunction
         *
         * @returns {Boolean}
         */
        validate : function(stencilFunction) {
            return ((stencilFunction === StencilFunction.NEVER) ||
                    (stencilFunction === StencilFunction.LESS) ||
                    (stencilFunction === StencilFunction.EQUAL) ||
                    (stencilFunction === StencilFunction.LESS_OR_EQUAL) ||
                    (stencilFunction === StencilFunction.GREATER) ||
                    (stencilFunction === StencilFunction.NOT_EQUAL) ||
                    (stencilFunction === StencilFunction.GREATER_OR_EQUAL) ||
                    (stencilFunction === StencilFunction.ALWAYS));
        }
    };

    return StencilFunction;
});
