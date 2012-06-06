/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlString',
        './CzmlColor',
        './DynamicProperty'
       ], function(
        TimeInterval,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlString,
        CzmlColor,
        DynamicProperty) {
    "use strict";

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

    DynamicLabel.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var labelData = packet.label;
        if (typeof labelData !== 'undefined') {

            var label = dynamicObject.label;
            var labelUpdated = typeof label === 'undefined';
            if (labelUpdated) {
                dynamicObject.label = label = new DynamicLabel();
            }

            var interval = labelData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            labelUpdated = DynamicProperty.processCzmlPacket(label, "text", CzmlString, labelData.text, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "font", CzmlString, labelData.font, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "show", CzmlBoolean, labelData.show, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "style", CzmlString, labelData.style, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "fillColor", CzmlColor, labelData.fillColor, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "outlineColor", CzmlColor, labelData.outlineColor, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "scale", CzmlNumber, labelData.scale, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "horizontalOrigin", CzmlString, labelData.horizontalOrigin, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "verticalOrigin", CzmlString, labelData.verticalOrigin, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "eyeOffset", CzmlCartesian3, labelData.eyeOffset, interval, dynamicObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "pixelOffset", CzmlCartesian2, labelData.pixelOffset, interval, dynamicObjectCollection) || labelUpdated;
            return labelUpdated;
        }
    };

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

    DynamicLabel.undefineProperties = function(dynamicObject) {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});