/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Style options for corners.
     *
     * @namespace
     * @alias CornerType
     */
    var CornerType = {
        /**
         * <pre>
         *  _____
         * (  ___
         * | |
         * </pre>
         *
         * Corner is circular.
         * @type {Number}
         * @constant
         */
        ROUNDED : 0,

        /**
         * <pre>
         *  ______
         * |  ____
         * | |
         * </pre>
         *
         * Corner point is the intersection of adjacent edges.
         * @type {Number}
         * @constant
         */
        MITERED : 1,

        /**
         * <pre>
         *  _____
         * /  ___
         * | |
         * </pre>
         *
         * Corner is clipped.
         * @type {Number}
         * @constant
         */
        BEVELED : 2
    };

    return freezeObject(CornerType);
});