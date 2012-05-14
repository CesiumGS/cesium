/*global define*/
define(['./DynamicProperty',
        './DynamicPositionProperty',
        './DynamicVertexPositionsProperty',
        './QuaternionDataHandler'
    ], function(
        DynamicProperty,
        DynamicPositionProperty,
        DynamicVertexPositionsProperty,
        QuaternionDataHandler) {
    "use strict";

    function DynamicObject(id) {
        //TODO Throw developer error on undefined id?
        this.id = id;
    }

    DynamicObject.createOrUpdatePosition = function(dynamicObject, packet, buffer, sourceUri) {
        var positionData = packet.position;
        if (typeof positionData !== 'undefined') {
            dynamicObject.position = DynamicPositionProperty.createOrUpdate(positionData, buffer, sourceUri, dynamicObject.position);
        }
    };

    DynamicObject.createOrUpdateOrientation = function(dynamicObject, packet, buffer, sourceUri) {
        var orientationData = packet.orientation;
        if (typeof orientationData !== 'undefined') {
            dynamicObject.orientation = DynamicProperty.createOrUpdate(QuaternionDataHandler, orientationData, buffer, sourceUri, dynamicObject.orientation);
        }
    };

    DynamicObject.createOrUpdateVertexPositions = function(dynamicObject, packet, buffer, sourceUri) {
        var vertexPositions = packet.vertexPositions;
        if (typeof vertexPositions !== 'undefined') {
            dynamicObject.vertexPositions = DynamicVertexPositionsProperty.createOrUpdate(vertexPositions, buffer, sourceUri, dynamicObject.vertexPositions);
        }
    };

    return DynamicObject;
});