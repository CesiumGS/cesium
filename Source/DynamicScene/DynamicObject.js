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
            var position = DynamicPositionProperty.createOrUpdate(positionData, buffer, sourceUri, dynamicObject.position);
            if (typeof dynamicObject.position === 'undefined') {
                dynamicObject.position = position;
                return true;
            }
            return false;
        }
    };

    DynamicObject.createOrUpdateOrientation = function(dynamicObject, packet, czmlObjectCollection) {
        var orientationData = packet.orientation;
        if (typeof orientationData !== 'undefined') {
            return DynamicProperty.createOrUpdate(dynamicObject, "orientation", QuaternionDataHandler, orientationData, undefined, czmlObjectCollection);
        }
        return false;
    };

    DynamicObject.createOrUpdateVertexPositions = function(dynamicObject, packet, buffer, sourceUri) {
        var vertexPositionsData = packet.vertexPositions;
        if (typeof vertexPositionsData !== 'undefined') {
            var vertexPositions = DynamicVertexPositionsProperty.createOrUpdate(vertexPositionsData, buffer, sourceUri, dynamicObject.vertexPositions);
            if (typeof dynamicObject.vertexPositions === 'undefined') {
                dynamicObject.vertexPositions = vertexPositions;
                return true;
            }
            return false;
        }
    };

    DynamicObject.mergeProperties = function(existingObject, objectToMerge) {
        existingObject.position = existingObject.position || objectToMerge.position;
        existingObject.orientation = existingObject.orientation || objectToMerge.orientation;
        existingObject.vertexPositions = existingObject.vertexPositions || objectToMerge.vertexPositions;
    };

    DynamicObject.deleteProperties = function(existingObject) {
        existingObject.position = undefined;
        existingObject.orientation = undefined;
        existingObject.vertexPositions = undefined;
    };

    return DynamicObject;
});