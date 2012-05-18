/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty',
        './DynamicMaterialProperty'
       ], function(
         TimeInterval,
         BooleanDataHandler,
         NumberDataHandler,
         ColorDataHandler,
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

    DynamicCone.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
        //See if there's any actual data to process.
        var coneData = packet.cone, cone;
        if (typeof coneData !== 'undefined') {

            cone = dynamicObject.cone;

            //Create a new cone if we don't have one yet.
            if (typeof cone === 'undefined') {
                cone = new DynamicCone();
                dynamicObject.cone = cone;
            }

            var interval = coneData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            cone.show = DynamicProperty.createOrUpdate(BooleanDataHandler, coneData.show, buffer, sourceUri, cone.show, interval);
            cone.innerHalfAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.innerHalfAngle, buffer, sourceUri, cone.innerHalfAngle, interval);
            cone.outerHalfAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.outerHalfAngle, buffer, sourceUri, cone.outerHalfAngle, interval);
            cone.minimumClockAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.minimumClockAngle, buffer, sourceUri, cone.minimumClockAngle, interval);
            cone.maximumClockAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.maximumClockAngle, buffer, sourceUri, cone.maximumClockAngle, interval);
            cone.radius = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.radius, buffer, sourceUri, cone.radius, interval);
            cone.showIntersection = DynamicProperty.createOrUpdate(BooleanDataHandler, coneData.showIntersection, buffer, sourceUri, cone.showIntersection, interval);
            cone.intersectionColor = DynamicProperty.createOrUpdate(ColorDataHandler, coneData.intersectionColor, buffer, sourceUri, cone.intersectionColor, interval);
            cone.capMaterial = DynamicMaterialProperty.createOrUpdate(coneData.capMaterial, buffer, sourceUri, cone.capMaterial, interval);
            cone.innerMaterial = DynamicMaterialProperty.createOrUpdate(coneData.innerMaterial, buffer, sourceUri, cone.innerMaterial, interval);
            cone.outerMaterial = DynamicMaterialProperty.createOrUpdate(coneData.outerMaterial, buffer, sourceUri, cone.outerMaterial, interval);
            cone.silhouetteMaterial = DynamicMaterialProperty.createOrUpdate(coneData.silhouetteMaterial, buffer, sourceUri, cone.silhouetteMaterial, interval);
        }
    };

    return DynamicCone;
});
