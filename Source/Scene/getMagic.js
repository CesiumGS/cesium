/*global define*/
define([
        '../Core/getStringFromTypedArray'
    ], function(
        getStringFromTypedArray) {
    "use strict";

    /**
     * @private
     */
    var getMagic = function(arrayBuffer) {
        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getStringFromTypedArray(getSubarray(uint8Array, 0, Math.min(4, uint8Array.length)));
        return magic;
    };

    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    return getMagic;
});