/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        START : new Enumeration(0, 'START'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        LOADING : new Enumeration(1, 'LOADING'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        READY : new Enumeration(2, 'READY')
    };

    return TileState;
});
