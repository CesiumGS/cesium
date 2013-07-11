/*global define*/
define([
        './Enumeration',
        './DeveloperError',
        './Math'
    ], function(
        Enumeration,
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * Enumerations for WebGL index datatypes.  These corresponds to the
     * <code>type</code> parameter of <a href="http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml">drawElements</a>.
     *
     * @alias IndexDatatype
     * @enumeration
     */
    var IndexDatatype = {
        /**
         * 8-bit unsigned byte enumeration corresponding to <code>UNSIGNED_BYTE</code> and the type
         * of an element in <code>Uint8Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1401
         */
        UNSIGNED_BYTE : new Enumeration(0x1401, 'UNSIGNED_BYTE'),

        /**
         * 16-bit unsigned short enumeration corresponding to <code>UNSIGNED_SHORT</code> and the type
         * of an element in <code>Uint16Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1403
         */
        UNSIGNED_SHORT : new Enumeration(0x1403, 'UNSIGNED_SHORT'),

        /**
         * 32-bit unsigned int enumeration corresponding to <code>UNSIGNED_INT</code> and the type
         * of an element in <code>Uint32Array</code>.
         *
         * @memberOf ComponentDatatype
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
     * Validates that the provided index datatype is a valid {@link IndexDatatype}
     *
     * @param {IndexDatatype} indexDatatype The index datatype to validate.
     *
     * @return {Boolean} <code>true</code> if the provided index datatype is a valid enumeration value; otherwise, <code>false</code>.
     *
     * @example
     * if (!IndexDatatype.validate(indexDatatype)) {
     *   throw new DeveloperError('indexDatatype must be a valid enumeration value.');
     * }
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
     * this.indices = IndexDatatype.createTypedArray(positions.length / 3, numberOfIndices);
     */
    IndexDatatype.createTypedArray = function(numberOfVertices, indicesLengthOrArray) {
        if (typeof numberOfVertices === 'undefined') {
            throw new DeveloperError('numberOfVertices is required.');
        }

        if (numberOfVertices > CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(indicesLengthOrArray);
        }

        return new Uint16Array(indicesLengthOrArray);
    };

    return IndexDatatype;
});
