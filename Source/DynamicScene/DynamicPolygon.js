/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
         TimeInterval,
         CzmlBoolean,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    function DynamicPolygon() {
        this.show = undefined;
        this.material = undefined;
    }

    DynamicPolygon.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection) {
        //See if there's any actual data to process.
        var polygonData = packet.polygon, polygon;
        if (typeof polygonData !== 'undefined') {

            polygon = dynamicObject.polygon;
            var polygonUpdated = false;

            //Create a new polygon if we don't have one yet.
            if (typeof polygon === 'undefined') {
                polygon = new DynamicPolygon();
                dynamicObject.polygon = polygon;
                polygonUpdated = true;
            }

            var interval = polygonData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            polygonUpdated = DynamicProperty.createOrUpdate(polygon, "show", CzmlBoolean, polygonData.show, interval, czmlObjectCollection) || polygonUpdated;
            polygonUpdated = DynamicMaterialProperty.createOrUpdate(polygon, "material", polygonData.material, interval, czmlObjectCollection) || polygonUpdated;
            return polygonUpdated;
        }
    };

    DynamicPolygon.mergeProperties = function(existingObject, objectToMerge) {
        var polygonToMerge = objectToMerge.polygon;
        if (typeof polygonToMerge !== 'undefined') {
            var target = existingObject.polygon;
            if (typeof target === 'undefined') {
                target = new DynamicPolygon();
                existingObject.conde = target;
            }
            target.show = target.show || polygonToMerge.show;
            target.material = target.material || polygonToMerge.material;
        }
    };

    DynamicPolygon.deleteProperties = function(existingObject) {
        existingObject.polygon = undefined;
    };

    return DynamicPolygon;
});