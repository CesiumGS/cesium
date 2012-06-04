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
        //See if there's any actual data to process.
        var pointData = packet.point, point;
        if (typeof pointData !== 'undefined') {

            point = dynamicObject.point;
            var pointUpdated = false;

            //Create a new point if we don't have one yet.
            if (typeof point === 'undefined') {
                point = new DynamicPoint();
                dynamicObject.point = point;
                pointUpdated = true;
            }

            var interval = pointData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
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
                targetPoint = new DynamicPoint();
                targetObject.point = targetPoint;
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
