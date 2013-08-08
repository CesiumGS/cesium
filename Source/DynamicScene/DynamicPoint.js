/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './processPacketData'
    ], function(
         TimeInterval,
         defaultValue,
         CzmlBoolean,
         CzmlNumber,
         CzmlColor,
         processPacketData) {
    "use strict";

    /**
     * Represents a time-dynamic point, typically used in conjunction with DynamicPointVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPoint
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPointVisualizer
     * @see VisualizerCollection
     * @see Billboard
     * @see BillboardCollection
     * @see CzmlDefaults
     */
    var DynamicPoint = function() {
        /**
         * A DynamicProperty of type CzmlColor which determines the point's color.
         * @type DynamicProperty
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the point's pixel size.
         * @type DynamicProperty
         */
        this.pixelSize = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the point's outline color.
         * @type DynamicProperty
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the point's outline width.
         * @type DynamicProperty
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the point's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's point.
     * If the DynamicObject does not have a point, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the point data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPoint.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var pointData = packet.point;
        if (typeof pointData === 'undefined') {
            return false;
        }

        var interval = pointData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        var point = dynamicObject.point;
        var pointUpdated = typeof point === 'undefined';
        if (pointUpdated) {
            dynamicObject.point = point = new DynamicPoint();
        }

        pointUpdated = processPacketData(CzmlColor, point, 'color', pointData.color, interval, sourceUri) || pointUpdated;
        pointUpdated = processPacketData(CzmlNumber, point, 'pixelSize', pointData.pixelSize, interval, sourceUri) || pointUpdated;
        pointUpdated = processPacketData(CzmlColor, point, 'outlineColor', pointData.outlineColor, interval, sourceUri) || pointUpdated;
        pointUpdated = processPacketData(CzmlNumber, point, 'outlineWidth', pointData.outlineWidth, interval, sourceUri) || pointUpdated;
        pointUpdated = processPacketData(CzmlBoolean, point, 'show', pointData.show, interval, sourceUri) || pointUpdated;

        return pointUpdated;
    };

    /**
     * Given two DynamicObjects, takes the point properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicPoint.mergeProperties = function(targetObject, objectToMerge) {
        var pointToMerge = objectToMerge.point;
        if (typeof pointToMerge !== 'undefined') {

            var targetPoint = targetObject.point;
            if (typeof targetPoint === 'undefined') {
                targetObject.point = targetPoint = new DynamicPoint();
            }

            targetPoint.color = defaultValue(targetPoint.color, pointToMerge.color);
            targetPoint.pixelSize = defaultValue(targetPoint.pixelSize, pointToMerge.pixelSize);
            targetPoint.outlineColor = defaultValue(targetPoint.outlineColor, pointToMerge.outlineColor);
            targetPoint.outlineWidth = defaultValue(targetPoint.outlineWidth, pointToMerge.outlineWidth);
            targetPoint.show = defaultValue(targetPoint.show, pointToMerge.show);
        }
    };

    /**
     * Given a DynamicObject, undefines the point associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the point from.
     *
     * @see CzmlDefaults
     */
    DynamicPoint.undefineProperties = function(dynamicObject) {
        dynamicObject.point = undefined;
    };

    return DynamicPoint;
});