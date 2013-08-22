/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Color'],
function(
        TimeInterval,
        defaultValue,
        defined,
        Color) {
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
     */
    var DynamicPath = function() {
        /**
         * A DynamicProperty of type Color which determines the line's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type Color which determines the line's outline color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type Number which determines the line's outline width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the lines's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type Number which determines the line's width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type Number which determines the maximum step size, in seconds, to take when sampling the position.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.resolution = undefined;
        /**
         * A DynamicProperty of type Number which determines the number of seconds in front of the object to show.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.leadTime = undefined;
        /**
         * A DynamicProperty of type Number which determines the the number of seconds behind the object to show.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.trailTime = undefined;
    };

    /**
     * Given two DynamicObjects, takes the path properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicPath.mergeProperties = function(targetObject, objectToMerge) {
        var pathToMerge = objectToMerge.path;
        if (defined(pathToMerge)) {

            var targetpath = targetObject.path;
            if (!defined(targetpath)) {
                targetObject.path = targetpath = new DynamicPath();
            }

            targetpath.color = defaultValue(targetpath.color, pathToMerge.color);
            targetpath.width = defaultValue(targetpath.width, pathToMerge.width);
            targetpath.resolution = defaultValue(targetpath.resolution, pathToMerge.resolution);
            targetpath.outlineColor = defaultValue(targetpath.outlineColor, pathToMerge.outlineColor);
            targetpath.outlineWidth = defaultValue(targetpath.outlineWidth, pathToMerge.outlineWidth);
            targetpath.show = defaultValue(targetpath.show, pathToMerge.show);
            targetpath.leadTime = defaultValue(targetpath.leadTime, pathToMerge.leadTime);
            targetpath.trailTime = defaultValue(targetpath.trailTime, pathToMerge.trailTime);
        }
    };

    /**
     * Given a DynamicObject, undefines the path associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the path from.
     */
    DynamicPath.undefineProperties = function(dynamicObject) {
        dynamicObject.path = undefined;
    };

    return DynamicPath;
});
