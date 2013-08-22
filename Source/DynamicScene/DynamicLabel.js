/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin',
        '../Scene/LabelStyle',
        '../Core/Color'
       ], function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        HorizontalOrigin,
        VerticalOrigin,
        LabelStyle,
        Color) {
    "use strict";

    /**
     * Represents a time-dynamic label, typically used in conjunction with DynamicLabelVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicLabel
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicLabelVisualizer
     * @see VisualizerCollection
     * @see Label
     * @see LabelCollection
     */
    var DynamicLabel = function() {
        /**
         * A DynamicProperty of type String which determines the label's text.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.text = undefined;
        /**
         * A DynamicProperty of type String which determines the label's font.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.font = undefined;
        /**
         * A DynamicProperty of type LabelStyle which determines the label's style.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.style = undefined;
        /**
         * A DynamicProperty of type Color which determines the label's fill color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.fillColor = undefined;
        /**
         * A DynamicProperty of type Color which determines the label's outline color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineColor = undefined;
        /**
         * A DynamicProperty of type Number which determines the label's outline width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outlineWidth = undefined;
        /**
         * A DynamicProperty of type HorizontalOrigin which determines the label's horizontal origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalOrigin = undefined;
        /**
         * A DynamicProperty of type VerticalOrigin which determines the label's vertical origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalOrigin = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the label's eye offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.eyeOffset = undefined;
        /**
         * A DynamicProperty of type Cartesian2 which determines the label's pixel offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.pixelOffset = undefined;
        /**
         * A DynamicProperty of type Number which determines the label's scale.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.scale = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the label's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the label properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
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
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the label from.
     */
    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});
