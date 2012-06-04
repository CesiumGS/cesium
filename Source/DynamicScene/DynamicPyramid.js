/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty',
        './DynamicDirectionsProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        CzmlBoolean,
        CzmlNumber,
        CzmlColor,
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

    DynamicPyramid.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection) {
        //See if there's any actual data to process.
        var pyramidData = packet.pyramid, pyramid;
        if (typeof pyramidData !== 'undefined') {

            pyramid = dynamicObject.pyramid;
            var pyramidUpdated = false;

            //Create a new pyramid if we don't have one yet.
            if (typeof pyramid === 'undefined') {
                pyramid = new DynamicPyramid();
                dynamicObject.pyramid = pyramid;
                pyramidUpdated = true;
            }

            var interval = pyramidData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            pyramidUpdated = DynamicProperty.createOrUpdate(pyramid, "show", CzmlBoolean, pyramidData.show, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicDirectionsProperty.createOrUpdate(pyramid, "directions", pyramidData.directions, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.createOrUpdate(pyramid, "radius", CzmlNumber, pyramidData.radius, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.createOrUpdate(pyramid, "showIntersection", CzmlBoolean, pyramidData.showIntersection, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.createOrUpdate(pyramid, "intersectionColor", CzmlColor, pyramidData.intersectionColor, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.createOrUpdate(pyramid, "erosion", CzmlNumber, pyramidData.erosion, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicMaterialProperty.createOrUpdate(pyramid, "material", pyramidData.material, interval, czmlObjectCollection) || pyramidUpdated;

            return pyramidUpdated;
        }
    };

    DynamicPyramid.mergeProperties = function(existingObject, objectToMerge) {
        var pyramidToMerge = objectToMerge.pyramid;
        if (typeof pyramidToMerge !== 'undefined') {
            var target = existingObject.pyramid;
            if (typeof target === 'undefined') {
                target = new DynamicPyramid();
                existingObject.pyramid = target;
            }
            target.show = target.show || pyramidToMerge.show;
            target.directions = target.directions || pyramidToMerge.directions;
            target.radius = target.radius || pyramidToMerge.radius;
            target.showIntersection = target.showIntersection || pyramidToMerge.showIntersection;
            target.intersectionColor = target.intersectionColor || pyramidToMerge.intersectionColor;
            target.erosion = target.erosion || pyramidToMerge.erosion;
            target.material = target.material || pyramidToMerge.material;
        }
    };

    DynamicPyramid.deleteProperties = function(existingObject) {
        existingObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
