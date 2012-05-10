/*global define*/
define([
        './QuaternionDataHandler',
        './createOrUpdateProperty'
    ], function(
        QuaternionDataHandler,
        createOrUpdateProperty) {
    "use strict";

    return function(dynamicObject, packet, buffer, sourceUri) {
        var orientationData = packet.orientation;
        if (typeof orientationData !== 'undefined') {
            dynamicObject.orientation = createOrUpdateProperty(QuaternionDataHandler, orientationData, buffer, sourceUri, dynamicObject.orientation);
        }
    };
});