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
         * @type {Enumeration}
         * @constant
         * @default 0x200
         */
        NEVER : new Enumeration(0x0200, 'NEVER'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x201
         */
        LESS : new Enumeration(0x0201, 'LESS'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x202
         */
        EQUAL : new Enumeration(0x0202, 'EQUAL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x203
         */
        LESS_OR_EQUAL : new Enumeration(0x0203, 'LEQUAL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x204
         */
        GREATER : new Enumeration(0x0204, 'GREATER'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x25
         */
        NOT_EQUAL : new Enumeration(0x0205, 'NOTEQUAL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x206
         */
        GREATER_OR_EQUAL : new Enumeration(0x0206, 'GEQUAL'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x207
         */
        ALWAYS : new Enumeration(0x0207, 'ALWAYS'),

        /**
         * DOC_TBA
         *
         * @param {DepthFunction} depthFunction
         *
         * @returns {Boolean}
         */
        validate : function(depthFunction) {
            return ((depthFunction === DepthFunction.NEVER) ||
                    (depthFunction === DepthFunction.LESS) ||
                    (depthFunction === DepthFunction.EQUAL) ||
                    (depthFunction === DepthFunction.LESS_OR_EQUAL) ||
                    (depthFunction === DepthFunction.GREATER) ||
                    (depthFunction === DepthFunction.NOT_EQUAL) ||
                    (depthFunction === DepthFunction.GREATER_OR_EQUAL) ||
                    (depthFunction === DepthFunction.ALWAYS));
        }
    };

    return DepthFunction;
});
