/*global define*/
define(['./DynamicPoint',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './createOrUpdateProperty'],
function(DynamicPoint,
        BooleanDataHandler,
        NumberDataHandler,
        ColorDataHandler,
        createOrUpdateProperty) {
    "use strict";

    return function(dynamicObject, packet, buffer, sourceUri) {

        //See if there's any actual data to process.
        var pointData = packet.point, point;
        if (typeof pointData !== 'undefined') {

            point = dynamicObject.point;

            //Create a new point if we don't have one yet.
            if (typeof point === 'undefined') {
                point = new DynamicPoint();
                dynamicObject.point = point;
            }

            //Create or update each of the properties.
            point.color = createOrUpdateProperty(ColorDataHandler, pointData.color, buffer, sourceUri, point.color);
            point.pixelSize = createOrUpdateProperty(NumberDataHandler, pointData.pixelSize, buffer, sourceUri, point.pixelSize);
            point.outlineColor = createOrUpdateProperty(ColorDataHandler, pointData.outlineColor, buffer, sourceUri, point.outlineColor);
            point.outlineWidth = createOrUpdateProperty(NumberDataHandler, pointData.outlineWidth, buffer, sourceUri, point.outlineWidth);
            point.show = createOrUpdateProperty(BooleanDataHandler, pointData.show, buffer, sourceUri, point.show);
        }
    };
});