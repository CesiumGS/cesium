/*global define*/
define([
        './Cartesian3DataHandler',
        './createOrUpdatePositionProperty'
    ], function(
        Cartesian3DataHandler,
        createOrUpdatePositionProperty) {
    "use strict";
  return function(dynamicObject, packet, buffer, sourceUri) {
        var positionData = packet.position;
        if (typeof positionData !== 'undefined') {
            dynamicObject.position = createOrUpdatePositionProperty(positionData, buffer, sourceUri, dynamicObject.position);
        }
    };
});