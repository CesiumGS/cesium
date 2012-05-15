/*global define*/
define(['./BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty',
        './DynamicDirectionsProperty',
        './DynamicMaterialProperty'],
function(BooleanDataHandler,
         NumberDataHandler,
         ColorDataHandler,
         DynamicProperty,
         DynamicDirectionsProperty,
         DynamicMaterialProperty) {
    "use strict";

    function DynamicPyramid() {
        this.show = undefined;
        this.directions = undefined;
        this.radius = undefined;
        this.showIntersection = undefined;
        this.intersectionColor = undefined;
        this.erosion = undefined;
        this.material = undefined;
    }

    DynamicPyramid.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
        //See if there's any actual data to process.
        var pyramidData = packet.pyramid, pyramid;
        if (typeof pyramidData !== 'undefined') {

            pyramid = dynamicObject.pyramid;

            //Create a new pyramid if we don't have one yet.
            if (typeof pyramid === 'undefined') {
                pyramid = new DynamicPyramid();
                dynamicObject.pyramid = pyramid;
            }

            //Create or update each of the properties.
            pyramid.show = DynamicProperty.createOrUpdate(BooleanDataHandler, pyramidData.show, buffer, sourceUri, pyramid.show);
            pyramid.directions = DynamicDirectionsProperty.createOrUpdate(pyramidData.directions, buffer, sourceUri, pyramid.directions);
            pyramid.radius = DynamicProperty.createOrUpdate(NumberDataHandler, pyramidData.radius, buffer, sourceUri, pyramid.radius);
            pyramid.showIntersection = DynamicProperty.createOrUpdate(BooleanDataHandler, pyramidData.showIntersection, buffer, sourceUri, pyramid.showIntersection);
            pyramid.intersectionColor = DynamicProperty.createOrUpdate(ColorDataHandler, pyramidData.intersectionColor, buffer, sourceUri, pyramid.intersectionColor);
            pyramid.erosion = DynamicProperty.createOrUpdate(NumberDataHandler, pyramidData.erosion, buffer, sourceUri, pyramid.erosion);
            pyramid.material = DynamicMaterialProperty.createOrUpdate(pyramidData.material, buffer, sourceUri, pyramid.material);
        }
    };

    return DynamicPyramid;
});
