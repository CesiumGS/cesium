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

    DynamicLabel.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection, sourceUri) {
        //See if there's any actual data to process.
        var labelData = packet.label;
        if (typeof labelData !== 'undefined' &&
            (typeof labelData.text !== 'undefined' ||
             typeof labelData.font !== 'undefined' ||
             typeof labelData.show !== 'undefined' ||
             typeof labelData.style !== 'undefined' ||
             typeof labelData.fillColor !== 'undefined' ||
             typeof labelData.outlineColor !== 'undefined' ||
             typeof labelData.scale !== 'undefined' ||
             typeof labelData.horizontalOrigin !== 'undefined' ||
             typeof labelData.verticalOrigin !== 'undefined' ||
             typeof labelData.pixelOffset !== 'undefined' ||
             typeof labelData.eyeOffset !== 'undefined')) {

            var label = dynamicObject.label;
            var labelUpdated = false;

            //Create a new label if we don't have one yet.
            if (typeof label === 'undefined') {
                label = new DynamicLabel();
                dynamicObject.label = label;
                labelUpdated = true;
            }

            var interval = labelData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            labelUpdated = DynamicProperty.processCzmlPacket(label, "text", CzmlString, labelData.text, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "font", CzmlString, labelData.font, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "show", CzmlBoolean, labelData.show, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "style", CzmlString, labelData.style, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "fillColor", CzmlColor, labelData.fillColor, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "outlineColor", CzmlColor, labelData.outlineColor, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "scale", CzmlNumber, labelData.scale, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "horizontalOrigin", CzmlString, labelData.horizontalOrigin, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "verticalOrigin", CzmlString, labelData.verticalOrigin, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "eyeOffset", CzmlCartesian3, labelData.eyeOffset, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.processCzmlPacket(label, "pixelOffset", CzmlCartesian2, labelData.pixelOffset, interval, czmlObjectCollection) || labelUpdated;
            return labelUpdated;
        }
    };

    DynamicLabel.mergeProperties = function(targetObject, objectToMerge)
    {
        var labelToMerge = objectToMerge.label;
        if (typeof labelToMerge !== 'undefined') {
            var targetLabel = targetObject.label;
            if (typeof targetLabel === 'undefined') {
                targetLabel = new DynamicLabel();
                targetObject.label = targetLabel;
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

    DynamicLabel.undefineProperties = function(dynamicObject)
    {
        dynamicObject.label = undefined;
    };

    return DynamicLabel;
});