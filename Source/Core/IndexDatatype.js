/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports IndexDatatype
     */
    var IndexDatatype = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1401
         */
        UNSIGNED_BYTE : new Enumeration(0x1401, 'UNSIGNED_BYTE'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1403
         */
        UNSIGNED_SHORT : new Enumeration(0x1403, 'UNSIGNED_SHORT')
    };

    return IndexDatatype;
});
