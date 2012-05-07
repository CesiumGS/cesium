/*global define*/
define(['./DynamicLabel',
        './BooleanDataHandler',
        './Cartesian2DataHandler',
        './Cartesian3DataHandler',
        './NumberDataHandler',
        './StringDataHandler',
        './ColorDataHandler',
        './createOrUpdateProperty'],
function(DynamicLabel,
        BooleanDataHandler,
        Cartesian2DataHandler,
        Cartesian3DataHandler,
        NumberDataHandler,
        StringDataHandler,
        ColorDataHandler,
        createOrUpdateProperty) {
    "use strict";
    return function(dynamicObject, packet, buffer, sourceUri) {

        //See if there's any actual data to process.
        var labelData = packet.label, label;
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

            label = dynamicObject.label;

            //Create a new label if we don't have one yet.
            if (typeof label === 'undefined') {
                label = new DynamicLabel();
                dynamicObject.label = label;
            }

            //Create or update each of the properties.
            label.text = createOrUpdateProperty(StringDataHandler, labelData.text, buffer, sourceUri, label.text);
            label.font = createOrUpdateProperty(StringDataHandler, labelData.font, buffer, sourceUri, label.font);
            label.show = createOrUpdateProperty(BooleanDataHandler, labelData.show, buffer, sourceUri, label.show);
            label.style = createOrUpdateProperty(StringDataHandler, labelData.style, buffer, sourceUri, label.style);
            label.fillColor = createOrUpdateProperty(ColorDataHandler, labelData.fillColor, buffer, sourceUri, label.fillColor);
            label.outlineColor = createOrUpdateProperty(ColorDataHandler, labelData.outlineColor, buffer, sourceUri, label.outlineColor);
            label.scale = createOrUpdateProperty(NumberDataHandler, labelData.scale, buffer, sourceUri, label.scale);
            label.horizontalOrigin = createOrUpdateProperty(StringDataHandler, labelData.horizontalOrigin, buffer, sourceUri, label.horizontalOrigin);
            label.verticalOrigin = createOrUpdateProperty(StringDataHandler, labelData.verticalOrigin, buffer, sourceUri, label.verticalOrigin);
            label.eyeOffset = createOrUpdateProperty(Cartesian3DataHandler, labelData.eyeOffset, buffer, sourceUri, label.eyeOffset);
            label.pixelOffset = createOrUpdateProperty(Cartesian2DataHandler, labelData.pixelOffset, buffer, sourceUri, label.pixelOffset);
        }
    };
});