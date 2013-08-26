/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
       ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic label.
     * @alias DynamicLabel
     * @constructor
     */
    var DynamicLabel = function() {
        /**
         * Gets or sets the string {@link Property} specifying the the label's text.
         * @type {Property}
         */
        this.text = undefined;
        /**
         * Gets or sets the string {@link Property} specifying the the label's font.
         * @type {Property}
         */
        this.font = undefined;
        /**
         * Gets or sets the {@link LabelStyle} {@link Property} specifying the the label's style.
         * @type {Property}
         */
        this.style = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's fill color.
         * @type {Property}
         */
        this.fillColor = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the label outline's width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the label's horizontal origin.
         * @type {Property}
         */
        this.horizontalOrigin = undefined;
        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the label's vertical origin.
         * @type {Property}
         */
        this.verticalOrigin = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the label's eye offset.
         * @type {Property}
         */
        this.eyeOffset = undefined;
        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the label's pixel offset.
         * @type {Property}
         */
        this.pixelOffset = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the label's scale.
         * @type {Property}
         */
        this.scale = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the label's visibility.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the label properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicLabel.mergeProperties = function(targetObject, objectToMerge) {
        var labelToMerge = objectToMerge.label;
        if (defined(labelToMerge)) {

            var targetLabel = targetObject.label;
            if (!defined(targetLabel)) {
                targetObject.label = targetLabel = new DynamicLabel();
            }

            targetLabel.text = defaultValue(targetLabel.text, labelToMerge.text);
            targetLabel.font = defaultValue(targetLabel.font, labelToMerge.font);
            targetLabel.show = defaultValue(targetLabel.show, labelToMerge.show);
            targetLabel.style = defaultValue(targetLabel.style, labelToMerge.style);
            targetLabel.fillColor = defaultValue(targetLabel.fillColor, labelToMerge.fillColor);
            targetLabel.outlineColor = defaultValue(targetLabel.outlineColor, labelToMerge.outlineColor);
            targetLabel.outlineWidth = defaultValue(targetLabel.outlineWidth, labelToMerge.outlineWidth);
            targetLabel.scale = defaultValue(targetLabel.scale, labelToMerge.scale);
            targetLabel.horizontalOrigin = defaultValue(targetLabel.horizontalOrigin, labelToMerge.horizontalOrigin);
            targetLabel.verticalOrigin = defaultValue(targetLabel.verticalOrigin, labelToMerge.verticalOrigin);
            targetLabel.eyeOffset = defaultValue(targetLabel.eyeOffset, labelToMerge.eyeOffset);
            targetLabel.pixelOffset = defaultValue(targetLabel.pixelOffset, labelToMerge.pixelOffset);
        }
    };

    /**
     * Given a DynamicObject, undefines the label associated with it.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the label from.
     */
    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});
