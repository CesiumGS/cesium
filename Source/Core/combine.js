/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Combines the objects passed as arguments into a single result object containing
     * all properties from all objects.
     *
     * @exports combine
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