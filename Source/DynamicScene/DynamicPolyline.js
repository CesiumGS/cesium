/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'],
function(
        TimeInterval,
        CzmlBoolean,
        CzmlNumber,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    function DynamicPolyline() {
        this.color = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
        this.width = undefined;
    }

    DynamicPolyline.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection) {
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
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, "color", CzmlColor, polylineData.color, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, "outlineColor", CzmlColor, polylineData.outlineColor, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, "outlineWidth", CzmlNumber, polylineData.outlineWidth, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, "show", CzmlBoolean, polylineData.show, interval, czmlObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, "width", CzmlNumber, polylineData.width, interval, czmlObjectCollection) || polylineUpdated;

            return polylineUpdated;
        }
    };

    DynamicPolyline.mergeProperties = function(targetObject, objectToMerge) {
        var polylineToMerge = objectToMerge.polyline;
        if (typeof polylineToMerge !== 'undefined') {
            var targetPolyline = targetObject.polyline;
            if (typeof targetPolyline === 'undefined') {
                targetPolyline = new DynamicPolyline();
                targetObject.polyline = targetPolyline;
            }
            targetPolyline.color = targetPolyline.color || polylineToMerge.color;
            targetPolyline.pixelSize = targetPolyline.pixelSize || polylineToMerge.pixelSize;
            targetPolyline.outlineColor = targetPolyline.outlineColor || polylineToMerge.outlineColor;
            targetPolyline.outlineWidth = targetPolyline.outlineWidth || polylineToMerge.outlineWidth;
            targetPolyline.show = targetPolyline.show || polylineToMerge.show;
        }
    };

    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});