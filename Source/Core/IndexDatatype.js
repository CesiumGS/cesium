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
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_BYTE : new Enumeration(0x1401, 'UNSIGNED_BYTE'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_SHORT : new Enumeration(0x1403, 'UNSIGNED_SHORT'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        UNSIGNED_INT : new Enumeration(0x1405, 'UNSIGNED_INT')
    };

    IndexDatatype.UNSIGNED_BYTE.sizeInBytes = Uint8Array.BYTES_PER_ELEMENT;
    IndexDatatype.UNSIGNED_SHORT.sizeInBytes = Uint16Array.BYTES_PER_ELEMENT;
    IndexDatatype.UNSIGNED_INT.sizeInBytes = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * DOC_TBA
     */
    IndexDatatype.validate = function(indexDatatype) {
        return ((indexDatatype === IndexDatatype.UNSIGNED_BYTE) ||
                (indexDatatype === IndexDatatype.UNSIGNED_SHORT) ||
                (indexDatatype === IndexDatatype.UNSIGNED_INT));
    };

    return IndexDatatype;
});
