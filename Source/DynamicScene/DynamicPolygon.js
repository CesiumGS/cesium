/*global define*/
define(['./BooleanDataHandler',
        './DynamicProperty',
        './DynamicMaterialProperty',
        './DynamicColorMaterial'],
function(BooleanDataHandler,
         DynamicProperty,
         DynamicMaterialProperty,
         DynamicColorMaterial) {
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

            //Create or update each of the properties.
            polygon.show = DynamicProperty.createOrUpdate(BooleanDataHandler, polygonData.show, buffer, sourceUri, polygon.show);
            polygon.material = DynamicMaterialProperty.createOrUpdate(polygonData.material, [DynamicColorMaterial], buffer, sourceUri, polygon.material);
        }
    };

    return DynamicPolygon;
});