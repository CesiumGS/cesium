/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         */
        CLOCKWISE : 0x0900, // WebGL: CW
        /**
         * 0x0901. Vertices are in counter-clockwise order.
         *
         * @type {Number}
         * @constant
         */
        COUNTER_CLOCKWISE : 0x0901, // WebGL: CCW

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