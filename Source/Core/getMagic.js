/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getStringFromTypedArray'
    ], function(
        defaultValue,
        getStringFromTypedArray) {
    'use strict';

    /**
     * @private
     */
    function getMagic(uint8Array, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);
        return getStringFromTypedArray(uint8Array, byteOffset, Math.min(4, uint8Array.length));
    }

    return getMagic;
});
