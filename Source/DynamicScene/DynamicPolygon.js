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

    DynamicPolygon.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection) {
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
            polygonUpdated = DynamicProperty.processCzmlPacket(polygon, "show", CzmlBoolean, polygonData.show, interval, czmlObjectCollection) || polygonUpdated;
            polygonUpdated = DynamicMaterialProperty.processCzmlPacket(polygon, "material", polygonData.material, interval, czmlObjectCollection) || polygonUpdated;
            return polygonUpdated;
        }
    };

    DynamicPolygon.mergeProperties = function(targetObject, objectToMerge) {
        var polygonToMerge = objectToMerge.polygon;
        if (typeof polygonToMerge !== 'undefined') {
            var targetPolygon = targetObject.polygon;
            if (typeof targetPolygon === 'undefined') {
                targetPolygon = new DynamicPolygon();
                targetObject.polygon = targetPolygon;
            }
            targetPolygon.show = targetPolygon.show || polygonToMerge.show;
            targetPolygon.material = targetPolygon.material || polygonToMerge.material;
        }
    };

    DynamicPolygon.undefineProperties = function(dynamicObject) {
        dynamicObject.polygon = undefined;
    };

    return DynamicPolygon;
});