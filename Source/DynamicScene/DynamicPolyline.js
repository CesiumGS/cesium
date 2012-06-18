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

    DynamicPolyline.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var polylineData = packet.polyline;
        if (typeof polylineData !== 'undefined') {

            var polyline = dynamicObject.polyline;
            var polylineUpdated = typeof polyline === 'undefined';
            if (polylineUpdated) {
                dynamicObject.polyline = polyline = new DynamicPolyline();
            }

            var interval = polylineData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'color', CzmlColor, polylineData.color, interval, dynamicObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'outlineColor', CzmlColor, polylineData.outlineColor, interval, dynamicObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'outlineWidth', CzmlNumber, polylineData.outlineWidth, interval, dynamicObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'show', CzmlBoolean, polylineData.show, interval, dynamicObjectCollection) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'width', CzmlNumber, polylineData.width, interval, dynamicObjectCollection) || polylineUpdated;

            return polylineUpdated;
        }
    };

    DynamicPolyline.mergeProperties = function(targetObject, objectToMerge) {
        var polylineToMerge = objectToMerge.polyline;
        if (typeof polylineToMerge !== 'undefined') {

            var targetPolyline = targetObject.polyline;
            if (typeof targetPolyline === 'undefined') {
                targetObject.polyline = targetPolyline = new DynamicPolyline();
            }

            targetPolyline.color = targetPolyline.color || polylineToMerge.color;
            targetPolyline.width = targetPolyline.width || polylineToMerge.width;
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