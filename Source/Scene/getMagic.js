/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getStringFromTypedArray'
    ], function(
        defaultValue,
        getStringFromTypedArray) {
    "use strict";

    /**
     * @private
     */
    var getMagic = function(uint8Array, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);
        var magic = getStringFromTypedArray(uint8Array, byteOffset, Math.min(4, uint8Array.length));
        return magic;
    };

    return getMagic;
});