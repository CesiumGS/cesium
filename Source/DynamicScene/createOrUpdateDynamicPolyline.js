/*global define*/
define(['./DynamicPolyline',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './createOrUpdateProperty'],
function(DynamicPolyline,
        BooleanDataHandler,
        NumberDataHandler,
        ColorDataHandler,
        createOrUpdateProperty) {
    "use strict";
    return function(dynamicObject, packet, buffer, sourceUri) {

        //See if there's any actual data to process.
        var polylineData = packet.polyline, polyline;
        if (typeof polylineData !== 'undefined') {

            polyline = dynamicObject.polyline;

            //Create a new polyline if we don't have one yet.
            if (typeof polyline === 'undefined') {
                polyline = new DynamicPolyline();
                dynamicObject.polyline = polyline;
            }

            //Create or update each of the properties.
            polyline.color = createOrUpdateProperty(ColorDataHandler, polylineData.color, buffer, sourceUri, polyline.color);
            polyline.outlineColor = createOrUpdateProperty(ColorDataHandler, polylineData.outlineColor, buffer, sourceUri, polyline.outlineColor);
            polyline.outlineWidth = createOrUpdateProperty(NumberDataHandler, polylineData.outlineWidth, buffer, sourceUri, polyline.outlineWidth);
            polyline.show = createOrUpdateProperty(BooleanDataHandler, polylineData.show, buffer, sourceUri, polyline.show);
            polyline.width = createOrUpdateProperty(NumberDataHandler, polylineData.pixelSize, buffer, sourceUri, polyline.wudth);
        }
    };
});