/*global define*/
define(['./Cartesian3DataHandler',
        './createOrUpdateProperty'],
function(Cartesian3DataHandler,
         createOrUpdateProperty) {
    "use strict";
    return function(dynamicObject, packet, buffer, sourceUri) {
        var positionData = packet.position;
        if (typeof positionData !== 'undefined') {
            dynamicObject.position = createOrUpdateProperty(Cartesian3DataHandler, positionData, buffer, sourceUri, dynamicObject.position);
        }
    };
});