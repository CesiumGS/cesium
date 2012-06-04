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

    DynamicCone.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection, sourceUri) {
        //See if there's any actual data to process.
        var coneData = packet.cone, cone;
        if (typeof coneData !== 'undefined') {

            var coneUpdated = false;
            cone = dynamicObject.cone;

            //Create a new cone if we don't have one yet.
            if (typeof cone === 'undefined') {
                cone = new DynamicCone();
                dynamicObject.cone = cone;
                coneUpdated = true;
            }

            var interval = coneData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            coneUpdated = DynamicProperty.createOrUpdate(cone, "show", CzmlBoolean, coneData.show, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "innerHalfAngle", CzmlNumber, coneData.innerHalfAngle, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "outerHalfAngle", CzmlNumber, coneData.outerHalfAngle, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "minimumClockAngle", CzmlNumber, coneData.minimumClockAngle, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "maximumClockAngle", CzmlNumber, coneData.maximumClockAngle, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "radius", CzmlNumber, coneData.radius, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "showIntersection", CzmlBoolean, coneData.showIntersection, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicProperty.createOrUpdate(cone, "intersectionColor", CzmlColor, coneData.intersectionColor, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.createOrUpdate(cone, "capMaterial", coneData.capMaterial, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.createOrUpdate(cone, "innerMaterial", coneData.innerMaterial, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.createOrUpdate(cone, "outerMaterial", coneData.outerMaterial, interval, czmlObjectCollection) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.createOrUpdate(cone, "silhouetteMaterial", coneData.silhouetteMaterial, interval, czmlObjectCollection) || coneUpdated;
        }
    };

    DynamicCone.mergeProperties = function(existingObject, objectToMerge) {
        var coneToMerge = objectToMerge.cone;
        if (typeof coneToMerge !== 'undefined') {
            var target = existingObject.cone;
            if (typeof target === 'undefined') {
                target = new DynamicCone();
                existingObject.conde = target;
            }
            target.show = target.show || coneToMerge.show;
            target.innerHalfAngle = target.innerHalfAngle || coneToMerge.innerHalfAngle;
            target.outerHalfAngle = target.outerHalfAngle || coneToMerge.outerHalfAngle;
            target.minimumClockAngle = target.minimumClockAngle || coneToMerge.minimumClockAngle;
            target.maximumClockAngle = target.maximumClockAngle || coneToMerge.maximumClockAngle;
            target.radius = target.radius || coneToMerge.radius;
            target.showIntersection = target.showIntersection || coneToMerge.showIntersection;
            target.intersectionColor = target.intersectionColor || coneToMerge.intersectionColor;
            target.capMaterial = target.capMaterial || coneToMerge.capMaterial;
            target.innerMaterial = target.innerMaterial || coneToMerge.innerMaterial;
            target.outerMaterial = target.outerMaterial || coneToMerge.outerMaterial;
            target.silhouetteMaterial = target.silhouetteMaterial || coneToMerge.silhouetteMaterial;
        }
    };

    DynamicCone.deleteProperties = function(existingObject) {
        existingObject.cone = undefined;
    };

    return DynamicCone;
});
