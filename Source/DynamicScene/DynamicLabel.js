/*global define*/
define([
        './BooleanDataHandler',
        './Cartesian2DataHandler',
        './Cartesian3DataHandler',
        './NumberDataHandler',
        './StringDataHandler',
        './ColorDataHandler',
        './DynamicProperty'
    ], function(
        BooleanDataHandler,
        Cartesian2DataHandler,
        Cartesian3DataHandler,
        NumberDataHandler,
        StringDataHandler,
        ColorDataHandler,
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

    DynamicLabel.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
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

            //Create a new label if we don't have one yet.
            if (typeof label === 'undefined') {
                label = new DynamicLabel();
                dynamicObject.label = label;
            }

            //Create or update each of the properties.
            label.text = DynamicProperty.createOrUpdate(StringDataHandler, labelData.text, buffer, sourceUri, label.text);
            label.font = DynamicProperty.createOrUpdate(StringDataHandler, labelData.font, buffer, sourceUri, label.font);
            label.show = DynamicProperty.createOrUpdate(BooleanDataHandler, labelData.show, buffer, sourceUri, label.show);
            label.style = DynamicProperty.createOrUpdate(StringDataHandler, labelData.style, buffer, sourceUri, label.style);
            label.fillColor = DynamicProperty.createOrUpdate(ColorDataHandler, labelData.fillColor, buffer, sourceUri, label.fillColor);
            label.outlineColor = DynamicProperty.createOrUpdate(ColorDataHandler, labelData.outlineColor, buffer, sourceUri, label.outlineColor);
            label.scale = DynamicProperty.createOrUpdate(NumberDataHandler, labelData.scale, buffer, sourceUri, label.scale);
            label.horizontalOrigin = DynamicProperty.createOrUpdate(StringDataHandler, labelData.horizontalOrigin, buffer, sourceUri, label.horizontalOrigin);
            label.verticalOrigin = DynamicProperty.createOrUpdate(StringDataHandler, labelData.verticalOrigin, buffer, sourceUri, label.verticalOrigin);
            label.eyeOffset = DynamicProperty.createOrUpdate(Cartesian3DataHandler, labelData.eyeOffset, buffer, sourceUri, label.eyeOffset);
            label.pixelOffset = DynamicProperty.createOrUpdate(Cartesian2DataHandler, labelData.pixelOffset, buffer, sourceUri, label.pixelOffset);
        }
    };

    return DynamicLabel;
});