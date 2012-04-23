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
         * @constant
         * @type {Enumeration}
         */
        CLOCKWISE : new Enumeration(0x0900, "CW"),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        COUNTER_CLOCKWISE : new Enumeration(0x0901, "CCW")
    };

    return WindingOrder;
});