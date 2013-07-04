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
         * @type {Enumeration}
         * @constant
         * Wdefault 0x0404
         */
        FRONT : new Enumeration(0x0404, 'FRONT'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x405
         */
        BACK : new Enumeration(0x0405, 'BACK'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x408
         */
        FRONT_AND_BACK : new Enumeration(0x0408, 'FRONT_AND_BACK'),

        /**
         * DOC_TBA
         *
         * @param {CullFace} cullFace
         *
         * @returns {Boolean}
         */
        validate : function(cullFace) {
            return ((cullFace === CullFace.FRONT) ||
                    (cullFace === CullFace.BACK) ||
                    (cullFace === CullFace.FRONT_AND_BACK));
        }
    };

    return CullFace;
});
