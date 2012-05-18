/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
         TimeInterval,
         BooleanDataHandler,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    function DynamicPolygon() {
        this.show = undefined;
        this.material = undefined;
    }

    DynamicPolygon.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
        //See if there's any actual data to process.
        var polygonData = packet.polygon, polygon;
        if (typeof polygonData !== 'undefined') {

            polygon = dynamicObject.polygon;

            //Create a new polygon if we don't have one yet.
            if (typeof polygon === 'undefined') {
                polygon = new DynamicPolygon();
                dynamicObject.polygon = polygon;
            }

            var interval = polygonData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            polygon.show = DynamicProperty.createOrUpdate(BooleanDataHandler, polygonData.show, buffer, sourceUri, polygon.show, interval);
            polygon.material = DynamicMaterialProperty.createOrUpdate(polygonData.material, buffer, sourceUri, polygon.material, interval);
        }
    };

    return DynamicPolygon;
});