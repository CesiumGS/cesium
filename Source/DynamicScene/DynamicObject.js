/*global define*/
define(['./DynamicProperty',
        './DynamicPositionProperty',
        './DynamicVertexPositionsProperty',
        './CzmlQuaternion'
    ], function(
        DynamicProperty,
        DynamicPositionProperty,
        DynamicVertexPositionsProperty,
        CzmlQuaternion) {
    "use strict";

    function DynamicObject(id) {
        //TODO Throw developer error on undefined id?
        this.id = id;

        //Add all standard CZML properties, even though they won't all be used,
        //having the superset here will allow the compiler to better optimize this class.
        this.billboard = undefined;
        this.cone = undefined;
        this.directions = undefined;
        this.label = undefined;
        this.orientation = undefined;
        this.point = undefined;
        this.polygon = undefined;
        this.polyline = undefined;
        this.position = undefined;
        this.pyramid = undefined;
        this.vertexPositions = undefined;
    }

    DynamicObject.processCzmlPacketPosition = function(dynamicObject, packet, buffer, sourceUri) {
        var positionData = packet.position;
        if (typeof positionData !== 'undefined') {
            var position = DynamicPositionProperty.processCzmlPacket(positionData, buffer, sourceUri, dynamicObject.position);
            if (typeof dynamicObject.position === 'undefined') {
                dynamicObject.position = position;
                return true;
            }
            return false;
        }
    };

    DynamicObject.processCzmlPacketOrientation = function(dynamicObject, packet, czmlObjectCollection) {
        var orientationData = packet.orientation;
        if (typeof orientationData !== 'undefined') {
            return DynamicProperty.processCzmlPacket(dynamicObject, "orientation", CzmlQuaternion, orientationData, undefined, czmlObjectCollection);
        }
        return false;
    };

    DynamicObject.processCzmlPacketVertexPositions = function(dynamicObject, packet, buffer, sourceUri) {
        var vertexPositionsData = packet.vertexPositions;
        if (typeof vertexPositionsData !== 'undefined') {
            var vertexPositions = DynamicVertexPositionsProperty.processCzmlPacket(vertexPositionsData, buffer, sourceUri, dynamicObject.vertexPositions);
            if (typeof dynamicObject.vertexPositions === 'undefined') {
                dynamicObject.vertexPositions = vertexPositions;
                return true;
            }
            return false;
        }
    };

    DynamicObject.mergeProperties = function(targetObject, objectToMerge) {
        targetObject.position = targetObject.position || objectToMerge.position;
        targetObject.orientation = targetObject.orientation || objectToMerge.orientation;
        targetObject.vertexPositions = targetObject.vertexPositions || objectToMerge.vertexPositions;
    };

    DynamicObject.undefineProperties = function(dynamicObject) {
        dynamicObject.position = undefined;
        dynamicObject.orientation = undefined;
        dynamicObject.vertexPositions = undefined;
    };

    return DynamicObject;
});