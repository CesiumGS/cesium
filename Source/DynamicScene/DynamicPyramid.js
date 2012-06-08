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
        this.material = undefined;
    }

    DynamicPyramid.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var pyramidData = packet.pyramid;
        if (typeof pyramidData !== 'undefined') {

            var pyramid = dynamicObject.pyramid;
            var pyramidUpdated = typeof pyramid === 'undefined';
            if (pyramidUpdated) {
                dynamicObject.pyramid = pyramid = new DynamicPyramid();
            }

            var interval = pyramidData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'show', CzmlBoolean, pyramidData.show, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicDirectionsProperty.processCzmlPacket(pyramid, 'directions', pyramidData.directions, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'radius', CzmlNumber, pyramidData.radius, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'showIntersection', CzmlBoolean, pyramidData.showIntersection, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'intersectionColor', CzmlColor, pyramidData.intersectionColor, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicMaterialProperty.processCzmlPacket(pyramid, 'material', pyramidData.material, interval, dynamicObjectCollection) || pyramidUpdated;

            return pyramidUpdated;
        }
    };

    DynamicPyramid.mergeProperties = function(targetObject, objectToMerge) {
        var pyramidToMerge = objectToMerge.pyramid;
        if (typeof pyramidToMerge !== 'undefined') {

            var targetPyramid = targetObject.pyramid;
            if (typeof targetPyramid === 'undefined') {
                targetObject.pyramid = targetPyramid = new DynamicPyramid();
            }

            targetPyramid.show = targetPyramid.show || pyramidToMerge.show;
            targetPyramid.directions = targetPyramid.directions || pyramidToMerge.directions;
            targetPyramid.radius = targetPyramid.radius || pyramidToMerge.radius;
            targetPyramid.showIntersection = targetPyramid.showIntersection || pyramidToMerge.showIntersection;
            targetPyramid.intersectionColor = targetPyramid.intersectionColor || pyramidToMerge.intersectionColor;
            targetPyramid.material = targetPyramid.material || pyramidToMerge.material;
        }
    };

    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
