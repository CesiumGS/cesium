/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         * Wdefault 0x0404
         */
        FRONT : 0x0404,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x405
         */
        BACK : 0x0405,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x408
         */
        FRONT_AND_BACK : 0x0408
    };

    return CullFace;
});
