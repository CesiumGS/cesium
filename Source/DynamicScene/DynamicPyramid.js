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

    DynamicPyramid.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection) {
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
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, "show", CzmlBoolean, pyramidData.show, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicDirectionsProperty.processCzmlPacket(pyramid, "directions", pyramidData.directions, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, "radius", CzmlNumber, pyramidData.radius, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, "showIntersection", CzmlBoolean, pyramidData.showIntersection, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, "intersectionColor", CzmlColor, pyramidData.intersectionColor, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, "erosion", CzmlNumber, pyramidData.erosion, interval, czmlObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicMaterialProperty.processCzmlPacket(pyramid, "material", pyramidData.material, interval, czmlObjectCollection) || pyramidUpdated;

            return pyramidUpdated;
        }
    };

    DynamicPyramid.mergeProperties = function(targetObject, objectToMerge) {
        var pyramidToMerge = objectToMerge.pyramid;
        if (typeof pyramidToMerge !== 'undefined') {
            var targetPyramid = targetObject.pyramid;
            if (typeof targetPyramid === 'undefined') {
                targetPyramid = new DynamicPyramid();
                targetObject.pyramid = targetPyramid;
            }
            targetPyramid.show = targetPyramid.show || pyramidToMerge.show;
            targetPyramid.directions = targetPyramid.directions || pyramidToMerge.directions;
            targetPyramid.radius = targetPyramid.radius || pyramidToMerge.radius;
            targetPyramid.showIntersection = targetPyramid.showIntersection || pyramidToMerge.showIntersection;
            targetPyramid.intersectionColor = targetPyramid.intersectionColor || pyramidToMerge.intersectionColor;
            targetPyramid.erosion = targetPyramid.erosion || pyramidToMerge.erosion;
            targetPyramid.material = targetPyramid.material || pyramidToMerge.material;
        }
    };

    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
