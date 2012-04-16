/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports FrontFace
     */
    var FrontFace = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        CLOCKWISE : new Enumeration(0x0900, "CLOCKWISE"), // CW

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        COUNTER_CLOCKWISE : new Enumeration(0x0901, "COUNTER_CLOCKWISE") // CCW
    };

    return FrontFace;
});