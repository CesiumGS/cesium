/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './NumberDataHandler',
        './ColorDataHandler',
        './DynamicProperty',
        './DynamicDirectionsProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        BooleanDataHandler,
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

            var interval = pyramidData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            pyramid.show = DynamicProperty.createOrUpdate(BooleanDataHandler, pyramidData.show, buffer, sourceUri, pyramid.show, interval);
            pyramid.directions = DynamicDirectionsProperty.createOrUpdate(pyramidData.directions, buffer, sourceUri, pyramid.directions, interval);
            pyramid.radius = DynamicProperty.createOrUpdate(NumberDataHandler, pyramidData.radius, buffer, sourceUri, pyramid.radius, interval);
            pyramid.showIntersection = DynamicProperty.createOrUpdate(BooleanDataHandler, pyramidData.showIntersection, buffer, sourceUri, pyramid.showIntersection, interval);
            pyramid.intersectionColor = DynamicProperty.createOrUpdate(ColorDataHandler, pyramidData.intersectionColor, buffer, sourceUri, pyramid.intersectionColor, interval);
            pyramid.erosion = DynamicProperty.createOrUpdate(NumberDataHandler, pyramidData.erosion, buffer, sourceUri, pyramid.erosion, interval);
            pyramid.material = DynamicMaterialProperty.createOrUpdate(pyramidData.material, buffer, sourceUri, pyramid.material, interval);
        }
    };

    return DynamicPyramid;
});
