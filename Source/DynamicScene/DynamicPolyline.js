/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'],
function(
        TimeInterval,
        CzmlBoolean,
        CzmlNumber,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic polyline, typically used in conjunction with DynamicPolylineVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicPolyline
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPolylineVisualizer
     * @see VisualizerCollection
     * @see Polyline
     * @see CzmlStandard
     */
    function DynamicPolyline() {
        this.color = undefined;
        this.outlineColor = undefined;
        this.outlineWidth = undefined;
        this.show = undefined;
        this.width = undefined;
    }

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's polyline.
     * If the DynamicObject does not have a polyline, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param dynamicObject The DynamicObject which will contain the polyline data.
     * @param packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlStandard#updaters
     */
    DynamicPolyline.processCzmlPacket = function(dynamicObject, packet) {
        var polylineData = packet.polyline;
        var polylineUpdated = false;
        if (typeof polylineData !== 'undefined') {

            var polyline = dynamicObject.polyline;
            polylineUpdated = typeof polyline === 'undefined';
            if (polylineUpdated) {
                dynamicObject.polyline = polyline = new DynamicPolyline();
            }

            var interval = polylineData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'color', CzmlColor, polylineData.color, interval) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'outlineColor', CzmlColor, polylineData.outlineColor, interval) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'outlineWidth', CzmlNumber, polylineData.outlineWidth, interval) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'show', CzmlBoolean, polylineData.show, interval) || polylineUpdated;
            polylineUpdated = DynamicProperty.processCzmlPacket(polyline, 'width', CzmlNumber, polylineData.width, interval) || polylineUpdated;
        }
        return polylineUpdated;
    };

    /**
     * Given two DynamicObjects, takes the polyline properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlStandard
     */
    DynamicPolyline.mergeProperties = function(targetObject, objectToMerge) {
        var polylineToMerge = objectToMerge.polyline;
        if (typeof polylineToMerge !== 'undefined') {

            var targetPolyline = targetObject.polyline;
            if (typeof targetPolyline === 'undefined') {
                targetObject.polyline = targetPolyline = new DynamicPolyline();
            }

            targetPolyline.color = targetPolyline.color || polylineToMerge.color;
            targetPolyline.width = targetPolyline.width || polylineToMerge.width;
            targetPolyline.outlineColor = targetPolyline.outlineColor || polylineToMerge.outlineColor;
            targetPolyline.outlineWidth = targetPolyline.outlineWidth || polylineToMerge.outlineWidth;
            targetPolyline.show = targetPolyline.show || polylineToMerge.show;
        }
    };

    /**
     * Given a DynamicObject, undefines the polyline associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polyline from.
     *
     * @see CzmlStandard
     */
    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});