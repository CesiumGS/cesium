/*global define*/
define([
        './Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * Winding order defines the order of vertices for a triangle to be considered front-facing.
     *
     * @exports WindingOrder
     */
    var WindingOrder = {
        /**
         * 0x0900. Vertices are in clockwise order.
         *
         * @type {Enumeration}
         * @constant
         */
        CLOCKWISE : new Enumeration(0x0900, 'CLOCKWISE'), // WebGL: CW
        /**
         * 0x0901. Vertices are in counter-clockwise order.
         *
         * @type {Enumeration}
         * @constant
         */
        COUNTER_CLOCKWISE : new Enumeration(0x0901, 'COUNTER_CLOCKWISE'), // WebGL: CCW

        /**
         * @private
         */
        validate : function(windingOrder) {
            return ((windingOrder === WindingOrder.CLOCKWISE) ||
                    (windingOrder === WindingOrder.COUNTER_CLOCKWISE));
        }
    };

    return WindingOrder;
});
