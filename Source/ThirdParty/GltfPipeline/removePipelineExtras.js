define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Iterate through the objects within each glTF object and delete their pipeline extras object.
     *
     * @param {Object} object Root object to remove pipeline extras.
     * @returns {Object} glTF with no pipeline extras.
     */
    function removePipelineExtras(object) {
        if (defined(object) && typeof object === 'object') {
            if (defined(object.extras) && defined(object.extras._pipeline)) {
                delete object.extras._pipeline;
                // Also delete extras if extras._pipeline is the only extras object
                if (Object.keys(object.extras).length === 0) {
                    delete object.extras;
                }
            }

            //Recursively check subproperties for extras
            for (var propertyId in object) {
                if (object.hasOwnProperty(propertyId)) {
                    removePipelineExtras(object[propertyId]);
                }
            }
        }

        return object;
    }
    return removePipelineExtras;
});
