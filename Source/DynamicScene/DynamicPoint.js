/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'
    ], function(
         TimeInterval,
         CzmlBoolean,
         CzmlNumber,
         CzmlColor,
         DynamicProperty) {
    "use strict";

    function DynamicPoint() {
        this.color = undefined;
        this.pixelSize = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
    }

    DynamicPoint.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection) {
        var pointData = packet.point;
        if (typeof pointData !== 'undefined') {

            var point = dynamicObject.point;
            var pointUpdated = typeof point === 'undefined';
            if (pointUpdated) {
                dynamicObject.point = point = new DynamicPoint();
            }

            var interval = pointData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            pointUpdated = DynamicProperty.processCzmlPacket(point, "color", CzmlColor, pointData.color, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, "pixelSize", CzmlNumber, pointData.pixelSize, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, "outlineColor", CzmlColor, pointData.outlineColor, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, "outlineWidth", CzmlNumber, pointData.outlineWidth, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, "show", CzmlBoolean, pointData.show, interval, czmlObjectCollection) || pointUpdated;

            return pointUpdated;
        }
    };

    DynamicPoint.mergeProperties = function(targetObject, objectToMerge) {
        var pointToMerge = objectToMerge.point;
        if (typeof pointToMerge !== 'undefined') {

            var targetPoint = targetObject.point;
            if (typeof targetPoint === 'undefined') {
                targetObject.point = targetPoint = new DynamicPoint();
            }

            targetPoint.color = targetPoint.color || pointToMerge.color;
            targetPoint.pixelSize = targetPoint.pixelSize || pointToMerge.pixelSize;
            targetPoint.outlineColor = targetPoint.outlineColor || pointToMerge.outlineColor;
            targetPoint.outlineWidth = targetPoint.outlineWidth || pointToMerge.outlineWidth;
            targetPoint.show = targetPoint.show || pointToMerge.show;
        }
    };

    DynamicPoint.undefineProperties = function(dynamicObject) {
        dynamicObject.point = undefined;
    };

    return DynamicPoint;
});