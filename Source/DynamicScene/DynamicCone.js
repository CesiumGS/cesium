/*global define*/
define(['./BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty',
        './DynamicMaterialProperty'],
function(BooleanDataHandler,
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

            //Create or update each of the properties.
            cone.show = DynamicProperty.createOrUpdate(BooleanDataHandler, coneData.show, buffer, sourceUri, cone.show);
            cone.innerHalfAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.innerHalfAngle, buffer, sourceUri, cone.innerHalfAngle);
            cone.outerHalfAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.outerHalfAngle, buffer, sourceUri, cone.outerHalfAngle);
            cone.minimumClockAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.minimumClockAngle, buffer, sourceUri, cone.minimumClockAngle);
            cone.maximumClockAngle = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.maximumClockAngle, buffer, sourceUri, cone.maximumClockAngle);
            cone.radius = DynamicProperty.createOrUpdate(NumberDataHandler, coneData.radius, buffer, sourceUri, cone.radius);
            cone.showIntersection = DynamicProperty.createOrUpdate(BooleanDataHandler, coneData.showIntersection, buffer, sourceUri, cone.showIntersection);
            cone.intersectionColor = DynamicProperty.createOrUpdate(ColorDataHandler, coneData.intersectionColor, buffer, sourceUri, cone.intersectionColor);
            cone.capMaterial = DynamicMaterialProperty.createOrUpdate(coneData.capMaterial, buffer, sourceUri, cone.capMaterial);
            cone.innerMaterial = DynamicMaterialProperty.createOrUpdate(coneData.innerMaterial, buffer, sourceUri, cone.innerMaterial);
            cone.outerMaterial = DynamicMaterialProperty.createOrUpdate(coneData.outerMaterial, buffer, sourceUri, cone.outerMaterial);
            cone.silhouetteMaterial = DynamicMaterialProperty.createOrUpdate(coneData.silhouetteMaterial, buffer, sourceUri, cone.silhouetteMaterial);
        }
    };

    return DynamicCone;
});
