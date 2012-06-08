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
        ZERO : new Enumeration(0, 'ZERO'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        KEEP : new Enumeration(0x1E00, 'KEEP'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        REPLACE : new Enumeration(0x1E01, 'REPLACE'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INCREMENT : new Enumeration(0x1E02, 'INCREMENT'), // WebGL: INCR

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DECREMENT : new Enumeration(0x1E03, 'DECREMENT'), // WebGL: DECR

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INVERT : new Enumeration(0x150A, 'INVERT'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        INCREMENT_WRAP : new Enumeration(0x8507, 'INCREMENT_WRAP'), // WebGL: INCR_WRAP

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DECREMENT_WRAP : new Enumeration(0x8508, 'DECREMENT_WRAP'), // WebGL: DECR_WRAP

        /**
         * DOC_TBA
         *
         * @param stencilOperation
         *
         * @returns {Boolean}
         */
        validate : function(stencilOperation) {
            return ((stencilOperation === StencilOperation.ZERO) ||
                    (stencilOperation === StencilOperation.KEEP) ||
                    (stencilOperation === StencilOperation.REPLACE) ||
                    (stencilOperation === StencilOperation.INCREMENT) ||
                    (stencilOperation === StencilOperation.DECREMENT) ||
                    (stencilOperation === StencilOperation.INVERT) ||
                    (stencilOperation === StencilOperation.INCREMENT_WRAP) ||
                    (stencilOperation === StencilOperation.DECREMENT_WRAP));
        }
    };

    return StencilOperation;
});