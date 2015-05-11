/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/freezeObject'
    ], function(
        defined,
        DeveloperError,
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var PixelDatatype = {
        UNSIGNED_BYTE : 0x1401,
        UNSIGNED_SHORT : 0x1403,
        UNSIGNED_INT : 0x1405,
        FLOAT : 0x1406,
        UNSIGNED_INT_24_8_WEBGL : 0x84FA,
        UNSIGNED_SHORT_4_4_4_4 : 0x8033,
        UNSIGNED_SHORT_5_5_5_1 : 0x8034,
        UNSIGNED_SHORT_5_6_5 : 0x8363
    };

    PixelDatatype.validate = function(pixelDatatype) {
        return ((pixelDatatype === PixelDatatype.UNSIGNED_BYTE) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_SHORT) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_INT) ||
                (pixelDatatype === PixelDatatype.FLOAT) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8_WEBGL) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1) ||
                (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5));
    };

    PixelDatatype.createTypedArray = function(datatype, valuesOrLength) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(datatype)) {
            throw new DeveloperError('datatype is required.');
        }
        if (!defined(valuesOrLength)) {
            throw new DeveloperError('valuesOrLength is required.');
        }
        //>>includeEnd('debug');

        switch (datatype) {
        case PixelDatatype.UNSIGNED_BYTE:
            return new Uint8Array(valuesOrLength);
        case PixelDatatype.UNSIGNED_SHORT:
        case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
        case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
        case PixelDatatype.UNSIGNED_SHORT_5_6_5:
            return new Uint16Array(valuesOrLength);
        case PixelDatatype.UNSIGNED_INT:
        case PixelDatatype.UNSIGNED_INT_24_8_WEBGL:
            return new Uint32Array(valuesOrLength);
        case PixelDatatype.FLOAT:
            return new Float32Array(valuesOrLength);
        default:
            throw new DeveloperError('datatype is not a valid value.');
        }
    };

    return freezeObject(PixelDatatype);
});
