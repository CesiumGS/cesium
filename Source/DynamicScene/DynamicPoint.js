/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty'
    ], function(
         TimeInterval,
         BooleanDataHandler,
         NumberDataHandler,
         ColorDataHandler,
         DynamicProperty) {
    "use strict";

    function DynamicPoint() {
        this.color = undefined;
        this.pixelSize = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
    }

    DynamicPoint.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection) {
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
            pointUpdated = DynamicProperty.createOrUpdate(point, "color", ColorDataHandler, pointData.color, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.createOrUpdate(point, "pixelSize", NumberDataHandler, pointData.pixelSize, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.createOrUpdate(point, "outlineColor", ColorDataHandler, pointData.outlineColor, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.createOrUpdate(point, "outlineWidth", NumberDataHandler, pointData.outlineWidth, interval, czmlObjectCollection) || pointUpdated;
            pointUpdated = DynamicProperty.createOrUpdate(point, "show", BooleanDataHandler, pointData.show, interval, czmlObjectCollection) || pointUpdated;

            return pointUpdated;
        }
    };

    DynamicPoint.mergeProperties = function(existingObject, objectToMerge)
    {
        var pointToMerge = objectToMerge.point;
        if (typeof pointToMerge !== 'undefined') {
            var target = existingObject.point;
            if (typeof target === 'undefined') {
                target = new DynamicPoint();
                existingObject.point = target;
            }
            target.color = target.color || pointToMerge.color;
            target.pixelSize = target.pixelSize || pointToMerge.pixelSize;
            target.outlineColor = target.outlineColor || pointToMerge.outlineColor;
            target.outlineWidth = target.outlineWidth || pointToMerge.outlineWidth;
            target.show = target.show || pointToMerge.show;
        }
    };

    DynamicPoint.deleteProperties = function(existingObject)
    {
        existingObject.point = undefined;
    };

    return DynamicPoint;
});
