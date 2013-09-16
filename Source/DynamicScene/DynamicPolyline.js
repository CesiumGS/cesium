/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'],
function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic polyline.
     * @alias DynamicPolyline
     * @constructor
     */
    var DynamicPolyline = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the line's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the line's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the line's width.
         * @type {Property}
         */
        this.width = undefined;
    };

    /**
     * Given two DynamicObjects, takes the polyline properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polyline from.
     */
    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});
