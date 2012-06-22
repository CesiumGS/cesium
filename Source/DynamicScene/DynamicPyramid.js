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

    /**
     * Represents a time-dynamic pyramid, typically used in conjunction with DynamicPyramidVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicPyramid
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPyramidVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlStandard
     */
    function DynamicPyramid() {
        this.show = undefined;
        this.directions = undefined;
        this.radius = undefined;
        this.showIntersection = undefined;
        this.intersectionColor = undefined;
        this.material = undefined;
    }

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's pyramid.
     * If the DynamicObject does not have a pyramid, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the pyramid data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObject} dynamicObjectCollection The DynamicObjectCollection to which the DynamicObject belongs.
     *
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlStandard#updaters
     */
    DynamicPyramid.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var pyramidData = packet.pyramid;
        var pyramidUpdated = false;
        if (typeof pyramidData !== 'undefined') {

            var pyramid = dynamicObject.pyramid;
            pyramidUpdated = typeof pyramid === 'undefined';
            if (pyramidUpdated) {
                dynamicObject.pyramid = pyramid = new DynamicPyramid();
            }

            var interval = pyramidData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'show', CzmlBoolean, pyramidData.show, interval) || pyramidUpdated;
            pyramidUpdated = DynamicDirectionsProperty.processCzmlPacket(pyramid, 'directions', pyramidData.directions, interval, dynamicObjectCollection) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'radius', CzmlNumber, pyramidData.radius, interval) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'showIntersection', CzmlBoolean, pyramidData.showIntersection, interval) || pyramidUpdated;
            pyramidUpdated = DynamicProperty.processCzmlPacket(pyramid, 'intersectionColor', CzmlColor, pyramidData.intersectionColor, interval) || pyramidUpdated;
            pyramidUpdated = DynamicMaterialProperty.processCzmlPacket(pyramid, 'material', pyramidData.material, interval) || pyramidUpdated;
        }
        return pyramidUpdated;
    };

    /**
     * Given two DynamicObjects, takes the pyramid properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlStandard
     */
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

    /**
     * Given a DynamicObject, undefines the pyramid associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the pyramid from.
     *
     * @see CzmlStandard
     */
    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
