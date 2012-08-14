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
     * Represents a time-dynamic path, typically used in conjunction with DynamicPathVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPath
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPathVisualizer
     * @see VisualizerCollection
     * @see Polyline
     * @see CzmlDefaults
     */
    var DynamicPath = function() {
        /**
         * A DynamicProperty of type CzmlColor which determines the line's color.
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the line's outline color.
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the line's outline width.
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the lines's visibility.
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the line's width.
         */
        this.width = undefined;

        this.leadTime = undefined;
        this.trailTime = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's path.
     * If the DynamicObject does not have a path, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the path data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPath.processCzmlPacket = function(dynamicObject, packet) {
        var pathData = packet.path;
        if (typeof pathData === 'undefined') {
            return false;
        }

        var pathUpdated = false;
        var path = dynamicObject.path;
        pathUpdated = typeof path === 'undefined';
        if (pathUpdated) {
            dynamicObject.path = path = new DynamicPath();
        }

        var interval = pathData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof pathData.color !== 'undefined') {
            var color = path.color;
            if (typeof color === 'undefined') {
                path.color = color = new DynamicProperty(CzmlColor);
                pathUpdated = true;
            }
            color.processCzmlIntervals(pathData.color, interval);
        }

        if (typeof pathData.width !== 'undefined') {
            var width = path.width;
            if (typeof width === 'undefined') {
                path.width = width = new DynamicProperty(CzmlNumber);
                pathUpdated = true;
            }
            width.processCzmlIntervals(pathData.width, interval);
        }

        if (typeof pathData.outlineColor !== 'undefined') {
            var outlineColor = path.outlineColor;
            if (typeof outlineColor === 'undefined') {
                path.outlineColor = outlineColor = new DynamicProperty(CzmlColor);
                pathUpdated = true;
            }
            outlineColor.processCzmlIntervals(pathData.outlineColor, interval);
        }

        if (typeof pathData.outlineWidth !== 'undefined') {
            var outlineWidth = path.outlineWidth;
            if (typeof outlineWidth === 'undefined') {
                path.outlineWidth = outlineWidth = new DynamicProperty(CzmlNumber);
                pathUpdated = true;
            }
            outlineWidth.processCzmlIntervals(pathData.outlineWidth, interval);
        }

        if (typeof pathData.show !== 'undefined') {
            var show = path.show;
            if (typeof show === 'undefined') {
                path.show = show = new DynamicProperty(CzmlBoolean);
                pathUpdated = true;
            }
            show.processCzmlIntervals(pathData.show, interval);
        }

        if (typeof pathData.leadTime !== 'undefined') {
            var leadTime = path.leadTime;
            if (typeof leadTime === 'undefined') {
                path.leadTime = leadTime = new DynamicProperty(CzmlNumber);
                pathUpdated = true;
            }
            leadTime.processCzmlIntervals(pathData.leadTime, interval);
        }

        if (typeof pathData.trailTime !== 'undefined') {
            var trailTime = path.trailTime;
            if (typeof trailTime === 'undefined') {
                path.trailTime = trailTime = new DynamicProperty(CzmlNumber);
                pathUpdated = true;
            }
            trailTime.processCzmlIntervals(pathData.trailTime, interval);
        }

        return pathUpdated;
    };

    /**
     * Given two DynamicObjects, takes the path properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicPath.mergeProperties = function(targetObject, objectToMerge) {
        var pathToMerge = objectToMerge.path;
        if (typeof pathToMerge !== 'undefined') {

            var targetpath = targetObject.path;
            if (typeof targetpath === 'undefined') {
                targetObject.path = targetpath = new DynamicPath();
            }

            targetpath.color = targetpath.color || pathToMerge.color;
            targetpath.width = targetpath.width || pathToMerge.width;
            targetpath.outlineColor = targetpath.outlineColor || pathToMerge.outlineColor;
            targetpath.outlineWidth = targetpath.outlineWidth || pathToMerge.outlineWidth;
            targetpath.show = targetpath.show || pathToMerge.show;
            targetpath.leadTime = targetpath.leadTime || pathToMerge.leadTime;
            targetpath.trailTime = targetpath.trailTime || pathToMerge.trailTime;
        }
    };

    /**
     * Given a DynamicObject, undefines the path associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the path from.
     *
     * @see CzmlDefaults
     */
    DynamicPath.undefineProperties = function(dynamicObject) {
        dynamicObject.path = undefined;
    };

    return DynamicPath;
});