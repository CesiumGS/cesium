/*global define*/
define(['./DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} Duplicate member.
     */
    function combine() {
        var composite = {};

        for ( var i = 0, length = arguments.length; i < length; ++i) {
            var object = arguments[i];

            // Shallow copy
            for ( var key in object) {
                if (object.hasOwnProperty(key)) {
                    if (typeof composite[key] !== 'undefined') {
                        throw new DeveloperError('Duplicate member: ' + key);
                    }

                    composite[key] = object[key];
                }
            }
        }

        return composite;
    }

    return combine;
});