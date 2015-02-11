/*global define*/
define(function() {
    "use strict";

    /**
     * @private
     */
    var getStringFromTypedArray = function(buffer, byteOffset, length) {
        var view = new Uint8Array(buffer, byteOffset, length);

        if (typeof TextDecoder !== 'undefined') {
            var decoder = new TextDecoder('utf-8');
            return decoder.decode(view);
        }

        return String.fromCharCode.apply(String, view);
    }

    return getStringFromTypedArray;
});
