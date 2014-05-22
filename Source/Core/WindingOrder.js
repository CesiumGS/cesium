/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         * @default 0x0900
         */
        CLOCKWISE : 0x0900, // WebGL: CW
        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x901
         */
        COUNTER_CLOCKWISE : 0x0901, // WebGL CCW

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