/*global define*/
define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * @private
     */
    var PixelDatatype = {
        UNSIGNED_BYTE : WebGLConstants.UNSIGNED_BYTE,
        UNSIGNED_SHORT : WebGLConstants.UNSIGNED_SHORT,
        UNSIGNED_INT : WebGLConstants.UNSIGNED_INT,
        FLOAT : WebGLConstants.FLOAT,
        UNSIGNED_INT_24_8 : WebGLConstants.UNSIGNED_INT_24_8,
        UNSIGNED_SHORT_4_4_4_4 : WebGLConstants.UNSIGNED_SHORT_4_4_4_4,
        UNSIGNED_SHORT_5_5_5_1 : WebGLConstants.UNSIGNED_SHORT_5_5_5_1,
        UNSIGNED_SHORT_5_6_5 : WebGLConstants.UNSIGNED_SHORT_5_6_5,

        validate : function(pixelDatatype) {
            return ((pixelDatatype === PixelDatatype.UNSIGNED_BYTE) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_INT) ||
                    (pixelDatatype === PixelDatatype.FLOAT) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1) ||
                    (pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5));
        }
    };

    return freezeObject(PixelDatatype);
});
