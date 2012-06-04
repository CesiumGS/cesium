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

    DynamicLabel.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection, sourceUri) {
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
            labelUpdated = DynamicProperty.createOrUpdate(label, "text", CzmlString, labelData.text, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "font", CzmlString, labelData.font, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "show", CzmlBoolean, labelData.show, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "style", CzmlString, labelData.style, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "fillColor", CzmlColor, labelData.fillColor, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "outlineColor", CzmlColor, labelData.outlineColor, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "scale", CzmlNumber, labelData.scale, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "horizontalOrigin", CzmlString, labelData.horizontalOrigin, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "verticalOrigin", CzmlString, labelData.verticalOrigin, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "eyeOffset", CzmlCartesian3, labelData.eyeOffset, interval, czmlObjectCollection) || labelUpdated;
            labelUpdated = DynamicProperty.createOrUpdate(label, "pixelOffset", CzmlCartesian2, labelData.pixelOffset, interval, czmlObjectCollection) || labelUpdated;
            return labelUpdated;
        }
    };

    DynamicLabel.mergeProperties = function(existingObject, objectToMerge)
    {
        var labelToMerge = objectToMerge.label;
        if (typeof labelToMerge !== 'undefined') {
            var target = existingObject.label;
            if (typeof target === 'undefined') {
                target = new DynamicLabel();
                existingObject.label = target;
            }
            target.text = target.text || labelToMerge.text;
            target.font = target.font || labelToMerge.font;
            target.show = target.show || labelToMerge.show;
            target.style = target.style || labelToMerge.style;
            target.fillColor = target.fillColor || labelToMerge.fillColor;
            target.outlineColor = target.outlineColor || labelToMerge.outlineColor;
            target.scale = target.scale || labelToMerge.scale;
            target.horizontalOrigin = target.horizontalOrigin || labelToMerge.horizontalOrigin;
            target.verticalOrigin = target.verticalOrigin || labelToMerge.verticalOrigin;
            target.eyeOffset = target.eyeOffset || labelToMerge.eyeOffset;
            target.pixelOffset = target.pixelOffset || labelToMerge.pixelOffset;
        }
    };

    DynamicLabel.deleteProperties = function(existingObject)
    {
        existingObject.label = undefined;
    };

    return DynamicLabel;
});