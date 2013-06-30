/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TerrainState = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        FAILED : new Enumeration(0, 'FAILED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        UNLOADED : new Enumeration(1, 'UNLOADED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        RECEIVING : new Enumeration(2, 'RECEIVING'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        RECEIVED : new Enumeration(3, 'RECEIVED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 4
         */
        TRANSFORMING : new Enumeration(4, 'TRANSFORMING'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 5
         */
        TRANSFORMED : new Enumeration(5, 'TRANSFORMED'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 6
         */
        READY : new Enumeration(6, 'READY')
    };

    return TerrainState;
});
