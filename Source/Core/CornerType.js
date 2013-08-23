/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @exports CornerType
     */
    var CornerType = {
        /**
         *   .----
         * .`
         * |
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        ROUNDED : new Enumeration(0, 'ROUNDED', {
            morphTime : 0.0
        }),

        /**
         *  ____
         * |
         * |
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        MITERED : new Enumeration(1, 'MITERED', {
            morphTime : 0.0
        }),

        /**
         *   ____
         *  /
         * |
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        BEVELED : new Enumeration(2, 'BEVELED', {
            morphTime : 1.0
        })
    };

    return CornerType;
});