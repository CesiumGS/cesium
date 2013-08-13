/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './processPacketData',
        './DynamicDirectionsProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        CzmlBoolean,
        CzmlNumber,
        CzmlColor,
        processPacketData,
        DynamicDirectionsProperty,
        DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic pyramid, typically used in conjunction with DynamicPyramidVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPyramid
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPyramidVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicPyramid = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the pyramid's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicDirectionsProperty which determines the projection of the pyramid.
         * @type {DynamicDirectionsProperty}
         * @default undefined
         */
        this.directions = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the pyramid's radius.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.radius = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the pyramid's intersection visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.showIntersection = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the color of the line formed by the intersection of the pyramid and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the approximate pixel width of the line formed by the intersection of the pyramid and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionWidth = undefined;
        /**
         * A DynamicMaterialProperty which determines the material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.material = undefined;
    };

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
     * @see CzmlDefaults#updaters
     */
    DynamicPyramid.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var pyramidData = packet.pyramid;
        if (!defined(pyramidData)) {
            return false;
        }

        var interval = pyramidData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var pyramid = dynamicObject.pyramid;
        var pyramidUpdated = !defined(pyramid);
        if (pyramidUpdated) {
            dynamicObject.pyramid = pyramid = new DynamicPyramid();
        }

        pyramidUpdated = processPacketData(CzmlBoolean, pyramid, 'show', pyramidData.show, interval, sourceUri) || pyramidUpdated;
        pyramidUpdated = processPacketData(CzmlNumber, pyramid, 'radius', pyramidData.radius, interval, sourceUri) || pyramidUpdated;
        pyramidUpdated = processPacketData(CzmlBoolean, pyramid, 'showIntersection', pyramidData.showIntersection, interval, sourceUri) || pyramidUpdated;
        pyramidUpdated = processPacketData(CzmlColor, pyramid, 'intersectionColor', pyramidData.intersectionColor, interval, sourceUri) || pyramidUpdated;
        pyramidUpdated = processPacketData(CzmlNumber, pyramid, 'intersectionWidth', pyramidData.intersectionWidth, interval, sourceUri) || pyramidUpdated;

        if (defined(pyramidData.material)) {
            var material = pyramid.material;
            if (!defined(material)) {
                pyramid.material = material = new DynamicMaterialProperty();
                pyramidUpdated = true;
            }
            material.processCzmlIntervals(pyramidData.material, interval);
        }

        if (defined(pyramidData.directions)) {
            var directions = pyramid.directions;
            if (!defined(directions)) {
                pyramid.directions = directions = new DynamicDirectionsProperty();
                pyramidUpdated = true;
            }
            directions.processCzmlIntervals(pyramidData.directions, interval);
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
     * @see CzmlDefaults
     */
    DynamicPyramid.mergeProperties = function(targetObject, objectToMerge) {
        var pyramidToMerge = objectToMerge.pyramid;
        if (defined(pyramidToMerge)) {

            var targetPyramid = targetObject.pyramid;
            if (!defined(targetPyramid)) {
                targetObject.pyramid = targetPyramid = new DynamicPyramid();
            }

            targetPyramid.show = defaultValue(targetPyramid.show, pyramidToMerge.show);
            targetPyramid.directions = defaultValue(targetPyramid.directions, pyramidToMerge.directions);
            targetPyramid.radius = defaultValue(targetPyramid.radius, pyramidToMerge.radius);
            targetPyramid.showIntersection = defaultValue(targetPyramid.showIntersection, pyramidToMerge.showIntersection);
            targetPyramid.intersectionColor = defaultValue(targetPyramid.intersectionColor, pyramidToMerge.intersectionColor);
            targetPyramid.intersectionWidth = defaultValue(targetPyramid.intersectionWidth, pyramidToMerge.intersectionWidth);
            targetPyramid.material = defaultValue(targetPyramid.material, pyramidToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the pyramid associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the pyramid from.
     *
     * @see CzmlDefaults
     */
    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
