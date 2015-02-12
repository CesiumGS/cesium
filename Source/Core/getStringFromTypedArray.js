/*global define*/
define([
        './defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";
    /*global TextDecoder*/

    /**
     * @private
     */
    var getStringFromTypedArray = function(buffer, byteOffset, length) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(buffer)) {
            throw new DeveloperError('buffer is required.');
        }

        if (!defined(byteOffset)) {
            throw new DeveloperError('byteOffset is required.');
        }

        if (!defined(length)) {
            throw new DeveloperError('length is required.');
        }
        //>>includeEnd('debug');

        var view = new Uint8Array(buffer, byteOffset, length);

        if (typeof TextDecoder !== 'undefined') {
            var decoder = new TextDecoder('utf-8');
            return decoder.decode(view);
        }

        return String.fromCharCode.apply(String, view);
    };

    return getStringFromTypedArray;
});
