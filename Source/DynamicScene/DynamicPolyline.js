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

    DynamicPolyline.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
        //See if there's any actual data to process.
        var polylineData = packet.polyline, polyline;
        if (typeof polylineData !== 'undefined') {

            polyline = dynamicObject.polyline;

            //Create a new polyline if we don't have one yet.
            if (typeof polyline === 'undefined') {
                polyline = new DynamicPolyline();
                dynamicObject.polyline = polyline;
            }

            var interval = polylineData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            polyline.color = DynamicProperty.createOrUpdate(ColorDataHandler, polylineData.color, buffer, sourceUri, polyline.color, interval);
            polyline.outlineColor = DynamicProperty.createOrUpdate(ColorDataHandler, polylineData.outlineColor, buffer, sourceUri, polyline.outlineColor, interval);
            polyline.outlineWidth = DynamicProperty.createOrUpdate(NumberDataHandler, polylineData.outlineWidth, buffer, sourceUri, polyline.outlineWidth, interval);
            polyline.show = DynamicProperty.createOrUpdate(BooleanDataHandler, polylineData.show, buffer, sourceUri, polyline.show, interval);
            polyline.width = DynamicProperty.createOrUpdate(NumberDataHandler, polylineData.width, buffer, sourceUri, polyline.width, interval);
        }
    };

    return DynamicPolyline;
});