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
        '../Core/Color',
        './processPacketData'
       ], function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        HorizontalOrigin,
        VerticalOrigin,
        LabelStyle,
        Color,
        processPacketData) {
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
     * @see CzmlDefaults
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
     * Processes a single CZML packet and merges its data into the provided DynamicObject's label.
     * If the DynamicObject does not have a label, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the label data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicLabel.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var labelData = packet.label;
        if (!defined(labelData)) {
            return false;
        }

        var interval = labelData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var label = dynamicObject.label;
        var labelUpdated = !defined(label);
        if (labelUpdated) {
            dynamicObject.label = label = new DynamicLabel();
        }

        labelUpdated = processPacketData(Color, label, 'fillColor', labelData.fillColor, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Color, label, 'outlineColor', labelData.outlineColor, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Number, label, 'outlineWidth', labelData.outlineWidth, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Cartesian3, label, 'eyeOffset', labelData.eyeOffset, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(HorizontalOrigin, label, 'horizontalOrigin', labelData.horizontalOrigin, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(String, label, 'text', labelData.text, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Cartesian2, label, 'pixelOffset', labelData.pixelOffset, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Number, label, 'scale', labelData.scale, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(Boolean, label, 'show', labelData.show, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(VerticalOrigin, label, 'verticalOrigin', labelData.verticalOrigin, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(String, label, 'font', labelData.font, interval, sourceUri) || labelUpdated;
        labelUpdated = processPacketData(LabelStyle, label, 'style', labelData.style, interval, sourceUri) || labelUpdated;

        return labelUpdated;
    };

    /**
     * Given two DynamicObjects, takes the label properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
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
     *
     * @see CzmlDefaults
     */
    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});
