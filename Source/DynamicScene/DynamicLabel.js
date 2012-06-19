/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlString',
        './CzmlHorizontalOrigin',
        './CzmlVerticalOrigin',
        './CzmlLabelStyle',
        './CzmlColor',
        './DynamicProperty'
       ], function(
        TimeInterval,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlString,
        CzmlHorizontalOrigin,
        CzmlVerticalOrigin,
        CzmlLabelStyle,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic label, typically used in conjunction with DynamicLabelVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicLabel
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicLabelVisualizer
     * @see VisualizerCollection
     * @see Label
     * @see LabelCollection
     * @see CzmlStandard
     */
    function DynamicLabel() {
        this.text = undefined;
        this.font = undefined;
        this.style = undefined;
        this.fillColor = undefined;
        this.outlineColor = undefined;
        this.horizontalOrigin = undefined;
        this.verticalOrigin = undefined;
        this.eyeOffset = undefined;
        this.pixelOffset = undefined;
        this.scale = undefined;
        this.show = undefined;
    }

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's label.
     * If the DynamicObject does not have a label, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param dynamicObject The DynamicObject which will contain the label data.
     * @param packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlStandard#updaters
     */
    DynamicLabel.processCzmlPacket = function(dynamicObject, packet) {
        var labelData = packet.label;
        var labelUpdated = false;
        if (typeof labelData !== 'undefined') {

            var label = dynamicObject.label;
            labelUpdated = typeof label === 'undefined';
            if (labelUpdated) {
                dynamicObject.label = label = new DynamicLabel();
            }

            var interval = labelData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            labelUpdated = DynamicProperty.processCzmlPacket(label, 'text', CzmlString, labelData.text, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'font', CzmlString, labelData.font, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'show', CzmlBoolean, labelData.show, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'style', CzmlLabelStyle, labelData.style, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'fillColor', CzmlColor, labelData.fillColor, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'outlineColor', CzmlColor, labelData.outlineColor, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'scale', CzmlNumber, labelData.scale, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'horizontalOrigin', CzmlHorizontalOrigin, labelData.horizontalOrigin, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'verticalOrigin', CzmlVerticalOrigin, labelData.verticalOrigin, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'eyeOffset', CzmlCartesian3, labelData.eyeOffset, interval) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, 'pixelOffset', CzmlCartesian2, labelData.pixelOffset, interval) || labelUpdated;
        }
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
     * @see CzmlStandard
     */
    DynamicLabel.mergeProperties = function(targetObject, objectToMerge) {
        var labelToMerge = objectToMerge.label;
        if (typeof labelToMerge !== 'undefined') {

            var targetLabel = targetObject.label;
            if (typeof targetLabel === 'undefined') {
                targetObject.label = targetLabel = new DynamicLabel();
            }

            targetLabel.text = targetLabel.text || labelToMerge.text;
            targetLabel.font = targetLabel.font || labelToMerge.font;
            targetLabel.show = targetLabel.show || labelToMerge.show;
            targetLabel.style = targetLabel.style || labelToMerge.style;
            targetLabel.fillColor = targetLabel.fillColor || labelToMerge.fillColor;
            targetLabel.outlineColor = targetLabel.outlineColor || labelToMerge.outlineColor;
            targetLabel.scale = targetLabel.scale || labelToMerge.scale;
            targetLabel.horizontalOrigin = targetLabel.horizontalOrigin || labelToMerge.horizontalOrigin;
            targetLabel.verticalOrigin = targetLabel.verticalOrigin || labelToMerge.verticalOrigin;
            targetLabel.eyeOffset = targetLabel.eyeOffset || labelToMerge.eyeOffset;
            targetLabel.pixelOffset = targetLabel.pixelOffset || labelToMerge.pixelOffset;
        }
    };

    /**
     * Given a DynamicObject, undefines the label associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the label from.
     *
     * @see CzmlStandard
     */
    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});