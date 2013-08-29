/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue'
    ], function(
         defined,
         defaultValue) {
    "use strict";

    /**
     * An optionally time-dynamic billboard.
     * @alias DynamicPoint
     * @constructor
     */
    var DynamicPoint = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the point's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the point's size in pixels.
         * @type {Property}
         */
        this.pixelSize = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the point's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the point's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the point's visibility.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the point properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the point from.
     */
    DynamicPoint.undefineProperties = function(dynamicObject) {
        dynamicObject.point = undefined;
    };

    return DynamicPoint;
});
