/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'
    ], function(
         TimeInterval,
         CzmlBoolean,
         CzmlNumber,
         CzmlColor,
         DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic point, typically used in conjunction with DynamicPointVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicPoint
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPointVisualizer
     * @see VisualizerCollection
     * @see Billboard
     * @see BillboardCollection
     * @see CzmlStandard
     */
    function DynamicPoint() {
        this.color = undefined;
        this.pixelSize = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
    }

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
     * @see CzmlStandard#updaters
     */
    DynamicPoint.processCzmlPacket = function(dynamicObject, packet) {
        var pointData = packet.point;
        var pointUpdated = false;
        if (typeof pointData !== 'undefined') {

            var point = dynamicObject.point;
            pointUpdated = typeof point === 'undefined';
            if (pointUpdated) {
                dynamicObject.point = point = new DynamicPoint();
            }

            var interval = pointData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            pointUpdated = DynamicProperty.processCzmlPacket(point, 'color', CzmlColor, pointData.color, interval) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, 'pixelSize', CzmlNumber, pointData.pixelSize, interval) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, 'outlineColor', CzmlColor, pointData.outlineColor, interval) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, 'outlineWidth', CzmlNumber, pointData.outlineWidth, interval) || pointUpdated;
            pointUpdated = DynamicProperty.processCzmlPacket(point, 'show', CzmlBoolean, pointData.show, interval) || pointUpdated;
        }
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
     * @see CzmlStandard
     */
    DynamicPoint.mergeProperties = function(targetObject, objectToMerge) {
        var pointToMerge = objectToMerge.point;
        if (typeof pointToMerge !== 'undefined') {

            var targetPoint = targetObject.point;
            if (typeof targetPoint === 'undefined') {
                targetObject.point = targetPoint = new DynamicPoint();
            }

            targetPoint.color = targetPoint.color || pointToMerge.color;
            targetPoint.pixelSize = targetPoint.pixelSize || pointToMerge.pixelSize;
            targetPoint.outlineColor = targetPoint.outlineColor || pointToMerge.outlineColor;
            targetPoint.outlineWidth = targetPoint.outlineWidth || pointToMerge.outlineWidth;
            targetPoint.show = targetPoint.show || pointToMerge.show;
        }
    };

    /**
     * Given a DynamicObject, undefines the point associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the point from.
     *
     * @see CzmlStandard
     */
    DynamicPoint.undefineProperties = function(dynamicObject) {
        dynamicObject.point = undefined;
    };

    return DynamicPoint;
});