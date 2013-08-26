/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue'
    ], function(
         defined,
         defaultValue) {
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
     */
    var DynamicPoint = function() {
        /**
         * A DynamicProperty of type Color which determines the point's color.
         * @type DynamicProperty
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type Number which determines the point's pixel size.
         * @type DynamicProperty
         */
        this.pixelSize = undefined;
        /**
         * A DynamicProperty of type Color which determines the point's outline color.
         * @type DynamicProperty
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type Number which determines the point's outline width.
         * @type DynamicProperty
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the point's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the point properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicPoint.mergeProperties = function(targetObject, objectToMerge) {
        var pointToMerge = objectToMerge.point;
        if (defined(pointToMerge)) {

            var targetPoint = targetObject.point;
            if (!defined(targetPoint)) {
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
     */
    DynamicPoint.undefineProperties = function(dynamicObject) {
        dynamicObject.point = undefined;
    };

    return DynamicPoint;
});
