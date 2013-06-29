/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var ImageryState = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        UNLOADED : new Enumeration(0, 'UNLOADED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        TRANSITIONING : new Enumeration(1, 'TRANSITIONING'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        RECEIVED : new Enumeration(2, 'RECEIVED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        TEXTURE_LOADED : new Enumeration(3, 'TEXTURE_LOADED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 4
         */
        READY : new Enumeration(4, 'READY'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 5
         */
        FAILED : new Enumeration(5, 'FAILED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 6
         */
        INVALID : new Enumeration(6, 'INVALID'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 7
         */
        PLACEHOLDER : new Enumeration(7, 'PLACEHOLDER')
    };

    return ImageryState;
});
