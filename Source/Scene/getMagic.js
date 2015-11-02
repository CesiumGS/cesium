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
    var getMagic = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);
        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, Math.min(4, uint8Array.length)));
        return magic;
    };

    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    return getMagic;
});