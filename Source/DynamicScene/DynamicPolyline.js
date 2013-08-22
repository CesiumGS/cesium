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
     */
    var DynamicPolyline = function() {
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
    };

    /**
     * Given two DynamicObjects, takes the polyline properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
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
     */
    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});
