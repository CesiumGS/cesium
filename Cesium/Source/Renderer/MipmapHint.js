/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports MipmapHint
     */
    var MipmapHint = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DONT_CARE : new Enumeration(0x1100, "DONT_CARE"), // DONT_CARE

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        FASTEST : new Enumeration(0x1101, "FASTEST"), // FASTEST

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NICEST : new Enumeration(0x1102, "NICEST") // NICEST
    };

    return MipmapHint;
});