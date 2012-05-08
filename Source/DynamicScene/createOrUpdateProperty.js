/*global define*/
define(['./DynamicProperty'],
function(DynamicProperty) {
    "use strict";

    return function(valueType, czmlIntervals, buffer, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicProperty(valueType);
        }
        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri);
        return existingProperty;
    };
});