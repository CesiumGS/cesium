/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports WindingOrder
     */
    var WindingOrder = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0900
         */
        CLOCKWISE : new Enumeration(0x0900, 'CLOCKWISE'), // WebGL: CW
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x901
         */
        COUNTER_CLOCKWISE : new Enumeration(0x0901, 'COUNTER_CLOCKWISE'), // WebGL CCW

        /**
         * DOC_TBA
         *
         * @param {WindingOrder} windingOrder
         *
         * @returns {Boolean}
         */
        validate : function(windingOrder) {
            return ((windingOrder === WindingOrder.CLOCKWISE) ||
                    (windingOrder === WindingOrder.COUNTER_CLOCKWISE));
        }
    };

    return WindingOrder;
});
