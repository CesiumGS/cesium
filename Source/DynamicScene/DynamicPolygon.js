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

    DynamicPolygon.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var polygonData = packet.polygon;
        if (typeof polygonData !== 'undefined') {

            var polygon = dynamicObject.polygon;
            var polygonUpdated = typeof polygon === 'undefined';
            if (polygonUpdated) {
                dynamicObject.polygon = polygon = new DynamicPolygon();
            }

            var interval = polygonData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            polygonUpdated = DynamicProperty.processCzmlPacket(polygon, 'show', CzmlBoolean, polygonData.show, interval, dynamicObjectCollection) || polygonUpdated;
            polygonUpdated = DynamicMaterialProperty.processCzmlPacket(polygon, 'material', polygonData.material, interval, dynamicObjectCollection) || polygonUpdated;
            return polygonUpdated;
        }
    };

    DynamicPolygon.mergeProperties = function(targetObject, objectToMerge) {
        var polygonToMerge = objectToMerge.polygon;
        if (typeof polygonToMerge !== 'undefined') {

            var targetPolygon = targetObject.polygon;
            if (typeof targetPolygon === 'undefined') {
                targetObject.polygon = targetPolygon = new DynamicPolygon();
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