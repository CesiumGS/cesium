/*global define*/
define([
        './Enumeration',
        './DeveloperError'
    ], function(
        Enumeration,
        DeveloperError) {
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

    /**
     * Creates a typed array that will store indices, using either <code><Uint16Array</code>
     * or <code>Uint32Array</code> depending on the number of vertices.
     *
     * @param {Number} numberOfVertices Number of vertices that the indices will reference.
     * @param {Any} indicesLengthOrArray Passed through to the typed array constructor.
     *
     * @return {Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>indicesLengthOrArray</code>.
     *
     * @exception {DeveloperError} center is required.
     *
     * @example
     * this.indexList = IndexDatatype.createTypedArray(positions.length / 3, numberOfIndices);
     */
    IndexDatatype.createTypedArray = function(numberOfVertices, indicesLengthOrArray) {
        if (typeof numberOfVertices === 'undefined') {
            throw new DeveloperError('numberOfVertices is required.');
        }

        if (numberOfVertices > 64 * 1024) {
            return new Uint32Array(indicesLengthOrArray);
        }

        return new Uint16Array(indicesLengthOrArray);
    };

    return IndexDatatype;
});
