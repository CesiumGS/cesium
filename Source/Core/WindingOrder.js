/*global define*/
define([
        '../Renderer/WebGLConstants',
        './freezeObject'
    ], function(
        WebGLConstants,
        freezeObject) {
    "use strict";

    /**
     * Winding order defines the order of vertices for a triangle to be considered front-facing.
     *
     * @exports WindingOrder
     */
    var WindingOrder = {
        /**
         * Vertices are in clockwise order.
         *
         * @type {Number}
         * @constant
         */
        CLOCKWISE : WebGLConstants.CW,

        /**
         * Vertices are in counter-clockwise order.
         *
         * @type {Number}
         * @constant
         */
        COUNTER_CLOCKWISE : WebGLConstants.CCW,

        /**
         * @private
         */
        validate : function(windingOrder) {
            return windingOrder === WindingOrder.CLOCKWISE ||
                   windingOrder === WindingOrder.COUNTER_CLOCKWISE;
        }
    };

    return freezeObject(WindingOrder);
});