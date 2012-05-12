/*global define*/
define([
        './Cartesian3DataHandler',
        './createOrUpdateVertexPositionsProperty'
    ], function(
        Cartesian3DataHandler,
        createOrUpdateVertexPositionsProperty) {
    "use strict";

    return function(dynamicObject, packet, buffer, sourceUri) {
        var vertexPositions = packet.vertexPositions;
        if (typeof vertexPositions !== 'undefined') {
            dynamicObject.vertexPositions = createOrUpdateVertexPositionsProperty(vertexPositions, buffer, sourceUri, dynamicObject.vertexPositions);
        }
    };
});