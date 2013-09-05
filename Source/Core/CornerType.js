/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        ROUNDED : new Enumeration(0, 'ROUNDED'),

        /**
         *  ______
         * |  ___
         * | |
         *
         * Corner point is the intersection of adjacent edges.
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        MITERED : new Enumeration(1, 'MITERED'),

        /**
         *   ___
         * /  ___
         * | |
         *
         * Corner is clipped.
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        BEVELED : new Enumeration(2, 'BEVELED')
    };

    return CornerType;
});