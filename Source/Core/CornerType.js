/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @exports CornerType
     */
    var CornerType = {
        /**
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        ROUNDED : new Enumeration(0, 'ROUNDED'),

        /**
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        MITERED : new Enumeration(1, 'MITERED'),

        /**
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        BEVELED : new Enumeration(2, 'BEVELED')
    };

    return CornerType;
});