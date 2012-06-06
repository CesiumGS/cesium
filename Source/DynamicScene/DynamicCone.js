/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty',
        './DynamicMaterialProperty'
       ], function(
         TimeInterval,
         CzmlBoolean,
         CzmlNumber,
         CzmlColor,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    function DynamicCone() {
        this.capMaterial = undefined;
        this.innerHalfAngle = undefined;
        this.innerMaterial = undefined;
        this.intersectionColor = undefined;
        this.maximumClockAngle = undefined;
        this.minimumClockAngle = undefined;
        this.outerHalfAngle = undefined;
        this.outerMaterial = undefined;
        this.radius = undefined;
        this.show = undefined;
        this.showIntersection = undefined;
        this.silhouetteMaterial = undefined;
    }

    DynamicCone.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var coneData = packet.cone;
        if (typeof coneData !== 'undefined') {

            var cone = dynamicObject.cone;
            var coneUpdated = typeof cone === 'undefined';
            if (coneUpdated) {
                dynamicObject.cone = cone = new DynamicCone();
            }

            var interval = coneData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            coneUpdated = DynamicProperty.processCzmlPacket(cone, "show", CzmlBoolean, coneData.show, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "innerHalfAngle", CzmlNumber, coneData.innerHalfAngle, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "outerHalfAngle", CzmlNumber, coneData.outerHalfAngle, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "minimumClockAngle", CzmlNumber, coneData.minimumClockAngle, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "maximumClockAngle", CzmlNumber, coneData.maximumClockAngle, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "radius", CzmlNumber, coneData.radius, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "showIntersection", CzmlBoolean, coneData.showIntersection, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, "intersectionColor", CzmlColor, coneData.intersectionColor, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, "capMaterial", coneData.capMaterial, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, "innerMaterial", coneData.innerMaterial, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, "outerMaterial", coneData.outerMaterial, interval, dynamicObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, "silhouetteMaterial", coneData.silhouetteMaterial, interval, dynamicObjectCollection) || coneUpdated;
        }
    };

    DynamicCone.mergeProperties = function(targetObject, objectToMerge) {
        var coneToMerge = objectToMerge.cone;
        if (typeof coneToMerge !== 'undefined') {

            var targetCone = targetObject.cone;
            if (typeof targetCone === 'undefined') {
                targetObject.cone = targetCone = new DynamicCone();
            }

            targetCone.show = targetCone.show || coneToMerge.show;
            targetCone.innerHalfAngle = targetCone.innerHalfAngle || coneToMerge.innerHalfAngle;
            targetCone.outerHalfAngle = targetCone.outerHalfAngle || coneToMerge.outerHalfAngle;
            targetCone.minimumClockAngle = targetCone.minimumClockAngle || coneToMerge.minimumClockAngle;
            targetCone.maximumClockAngle = targetCone.maximumClockAngle || coneToMerge.maximumClockAngle;
            targetCone.radius = targetCone.radius || coneToMerge.radius;
            targetCone.showIntersection = targetCone.showIntersection || coneToMerge.showIntersection;
            targetCone.intersectionColor = targetCone.intersectionColor || coneToMerge.intersectionColor;
            targetCone.capMaterial = targetCone.capMaterial || coneToMerge.capMaterial;
            targetCone.innerMaterial = targetCone.innerMaterial || coneToMerge.innerMaterial;
            targetCone.outerMaterial = targetCone.outerMaterial || coneToMerge.outerMaterial;
            targetCone.silhouetteMaterial = targetCone.silhouetteMaterial || coneToMerge.silhouetteMaterial;
        }
    };

    DynamicCone.undefineProperties = function(dynamicObject) {
        dynamicObject.cone = undefined;
    };

    return DynamicCone;
});