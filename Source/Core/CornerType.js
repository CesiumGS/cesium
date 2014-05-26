/*global define*/
define(function() {
    "use strict";

    /**
     * @exports CornerType
     */
    var CornerType = {
        /**
         *   ___
         * (  ___
         * | |
         *
         * Corner is circular.
         * @type {Number}
         * @constant
         */
        ROUNDED : 0,

        /**
         *  ______
         * |  ___
         * | |
         *
         * Corner point is the intersection of adjacent edges.
         * @type {Number}
         * @constant
         */
        MITERED : 1,

        /**
         *   ___
         * /  ___
         * | |
         *
         * Corner is clipped.
         * @type {Number}
         * @constant
         */
        BEVELED : 2
    };

    return CornerType;
});