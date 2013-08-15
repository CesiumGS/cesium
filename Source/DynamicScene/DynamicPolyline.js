/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'],
function(
        TimeInterval,
        defaultValue,
        defined,
        CzmlBoolean,
        CzmlNumber,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic polyline, typically used in conjunction with DynamicPolylineVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPolyline
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPolylineVisualizer
     * @see VisualizerCollection
     * @see Polyline
     * @see CzmlDefaults
     */
    var DynamicPolyline = function() {
        /**
         * A DynamicProperty of type CzmlColor which determines the line's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the line's outline color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the line's outline width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the lines's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the line's width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.width = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's polyline.
     * If the DynamicObject does not have a polyline, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the polyline data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPolyline.processCzmlPacket = function(dynamicObject, packet) {
        var polylineData = packet.polyline;
        if (!defined(polylineData)) {
            return false;
        }

        var polylineUpdated = false;
        var polyline = dynamicObject.polyline;
        polylineUpdated = !defined(polyline);
        if (polylineUpdated) {
            dynamicObject.polyline = polyline = new DynamicPolyline();
        }

        var interval = polylineData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (defined(polylineData.color)) {
            var color = polyline.color;
            if (!defined(color)) {
                polyline.color = color = new DynamicProperty(CzmlColor);
                polylineUpdated = true;
            }
            color.processCzmlIntervals(polylineData.color, interval);
        }

        if (defined(polylineData.width)) {
            var width = polyline.width;
            if (!defined(width)) {
                polyline.width = width = new DynamicProperty(CzmlNumber);
                polylineUpdated = true;
            }
            width.processCzmlIntervals(polylineData.width, interval);
        }

        if (defined(polylineData.outlineColor)) {
            var outlineColor = polyline.outlineColor;
            if (!defined(outlineColor)) {
                polyline.outlineColor = outlineColor = new DynamicProperty(CzmlColor);
                polylineUpdated = true;
            }
            outlineColor.processCzmlIntervals(polylineData.outlineColor, interval);
        }

        if (defined(polylineData.outlineWidth)) {
            var outlineWidth = polyline.outlineWidth;
            if (!defined(outlineWidth)) {
                polyline.outlineWidth = outlineWidth = new DynamicProperty(CzmlNumber);
                polylineUpdated = true;
            }
            outlineWidth.processCzmlIntervals(polylineData.outlineWidth, interval);
        }

        if (defined(polylineData.show)) {
            var show = polyline.show;
            if (!defined(show)) {
                polyline.show = show = new DynamicProperty(CzmlBoolean);
                polylineUpdated = true;
            }
            show.processCzmlIntervals(polylineData.show, interval);
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
     * @see CzmlDefaults
     */
    DynamicPolyline.mergeProperties = function(targetObject, objectToMerge) {
        var polylineToMerge = objectToMerge.polyline;
        if (defined(polylineToMerge)) {

            var targetPolyline = targetObject.polyline;
            if (!defined(targetPolyline)) {
                targetObject.polyline = targetPolyline = new DynamicPolyline();
            }

            targetPolyline.color = defaultValue(targetPolyline.color, polylineToMerge.color);
            targetPolyline.width = defaultValue(targetPolyline.width, polylineToMerge.width);
            targetPolyline.outlineColor = defaultValue(targetPolyline.outlineColor, polylineToMerge.outlineColor);
            targetPolyline.outlineWidth = defaultValue(targetPolyline.outlineWidth, polylineToMerge.outlineWidth);
            targetPolyline.show = defaultValue(targetPolyline.show, polylineToMerge.show);
        }
    };

    /**
     * Given a DynamicObject, undefines the polyline associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polyline from.
     *
     * @see CzmlDefaults
     */
    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});
