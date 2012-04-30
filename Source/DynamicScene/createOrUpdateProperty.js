/*global define*/
define(['./DynamicProperty'], function(DynamicProperty) {
    "use strict";

    return function(valueType, packet, buffer, sourceUri, existingProperty) {
        if (typeof packet === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicProperty(valueType);
        }
        existingProperty.addData(packet, buffer, sourceUri);
        return existingProperty;
    };
});