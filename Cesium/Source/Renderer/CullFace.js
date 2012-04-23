/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports CullFace
     */
    var CullFace = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        FRONT : new Enumeration(0x0404, "FRONT"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        BACK : new Enumeration(0x0405, "BACK"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        FRONT_AND_BACK : new Enumeration(0x0408, "FRONT_AND_BACK")
    };

    return CullFace;
});