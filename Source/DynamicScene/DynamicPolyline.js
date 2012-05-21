/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty'],
function(
        TimeInterval,
        BooleanDataHandler,
        NumberDataHandler,
        ColorDataHandler,
        DynamicProperty) {
    "use strict";

    function DynamicPolyline() {
        this.color = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
        this.width = undefined;
    }

    DynamicPolyline.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection) {
        //See if there's any actual data to process.
        var polylineData = packet.polyline, polyline;
        if (typeof polylineData !== 'undefined') {

            polyline = dynamicObject.polyline;
            var polylineUpdated = false;

            //Create a new polyline if we don't have one yet.
            if (typeof polyline === 'undefined') {
                polyline = new DynamicPolyline();
                dynamicObject.polyline = polyline;
                polylineUpdated = true;
            }

            var interval = polylineData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            polylineUpdated = DynamicProperty.createOrUpdate(polyline, "color", ColorDataHandler, polylineData.color, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.createOrUpdate(polyline, "outlineColor", ColorDataHandler, polylineData.outlineColor, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.createOrUpdate(polyline, "outlineWidth", NumberDataHandler, polylineData.outlineWidth, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.createOrUpdate(polyline, "show", BooleanDataHandler, polylineData.show, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.createOrUpdate(polyline, "width", NumberDataHandler, polylineData.width, interval, czmlObjectCollection) || polylineUpdated;

            return polylineUpdated;
        }
    };

    DynamicPolyline.mergeProperties = function(existingObject, objectToMerge)
    {
        var polylineToMerge = objectToMerge.polyline;
        if (typeof polylineToMerge !== 'undefined') {
            var target = existingObject.polyline;
            if (typeof target === 'undefined') {
                target = new DynamicPolyline();
                existingObject.polyline = target;
            }
            target.color = target.color || polylineToMerge.color;
            target.pixelSize = target.pixelSize || polylineToMerge.pixelSize;
            target.outlineColor = target.outlineColor || polylineToMerge.outlineColor;
            target.outlineWidth = target.outlineWidth || polylineToMerge.outlineWidth;
            target.show = target.show || polylineToMerge.show;
        }
    };

    DynamicPolyline.deleteProperties = function(existingObject)
    {
        existingObject.polyline = undefined;
    };

    return DynamicPolyline;
});