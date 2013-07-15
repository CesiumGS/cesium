/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty',
        './DynamicDirectionsProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        defaultValue,
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
    DynamicPyramid.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var pyramidData = packet.pyramid;
        if (typeof pyramidData === 'undefined') {
            return false;
        }

        var pyramidUpdated = false;
        var pyramid = dynamicObject.pyramid;
        pyramidUpdated = typeof pyramid === 'undefined';
        if (pyramidUpdated) {
            dynamicObject.pyramid = pyramid = new DynamicPyramid();
        }

        var interval = pyramidData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof pyramidData.show !== 'undefined') {
            var show = pyramid.show;
            if (typeof show === 'undefined') {
                pyramid.show = show = new DynamicProperty(CzmlBoolean);
                pyramidUpdated = true;
            }
            show.processCzmlIntervals(pyramidData.show, interval);
        }

        if (typeof pyramidData.radius !== 'undefined') {
            var radius = pyramid.radius;
            if (typeof radius === 'undefined') {
                pyramid.radius = radius = new DynamicProperty(CzmlNumber);
                pyramidUpdated = true;
            }
            radius.processCzmlIntervals(pyramidData.radius, interval);
        }

        if (typeof pyramidData.showIntersection !== 'undefined') {
            var showIntersection = pyramid.showIntersection;
            if (typeof showIntersection === 'undefined') {
                pyramid.showIntersection = showIntersection = new DynamicProperty(CzmlBoolean);
                pyramidUpdated = true;
            }
            showIntersection.processCzmlIntervals(pyramidData.showIntersection, interval);
        }

        if (typeof pyramidData.intersectionColor !== 'undefined') {
            var intersectionColor = pyramid.intersectionColor;
            if (typeof intersectionColor === 'undefined') {
                pyramid.intersectionColor = intersectionColor = new DynamicProperty(CzmlColor);
                pyramidUpdated = true;
            }
            intersectionColor.processCzmlIntervals(pyramidData.intersectionColor, interval);
        }

        if (typeof pyramidData.intersectionWidth !== 'undefined') {
            var intersectionWidth = pyramid.intersectionWidth;
            if (typeof intersectionWidth === 'undefined') {
                pyramid.intersectionWidth = intersectionWidth = new DynamicProperty(CzmlNumber);
                pyramidUpdated = true;
            }
            intersectionWidth.processCzmlIntervals(pyramidData.intersectionWidth, interval);
        }

        if (typeof pyramidData.material !== 'undefined') {
            var material = pyramid.material;
            if (typeof material === 'undefined') {
                pyramid.material = material = new DynamicMaterialProperty();
                pyramidUpdated = true;
            }
            material.processCzmlIntervals(pyramidData.material, interval);
        }

        if (typeof pyramidData.directions !== 'undefined') {
            var directions = pyramid.directions;
            if (typeof directions === 'undefined') {
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
        if (typeof pyramidToMerge !== 'undefined') {

            var targetPyramid = targetObject.pyramid;
            if (typeof targetPyramid === 'undefined') {
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
