/*global define*/
define(['DynamicScene/DynamicBillboard',
        'DynamicScene/BooleanDataHandler',
        'DynamicScene/Cartesian2DataHandler',
        'DynamicScene/Cartesian3DataHandler',
        'DynamicScene/NumberDataHandler',
        'DynamicScene/StringDataHandler',
        'DynamicScene/ColorDataHandler',
        'DynamicScene/createOrUpdateProperty'],
function(DynamicBillboard,
        BooleanDataHandler,
        Cartesian2DataHandler,
        Cartesian3DataHandler,
        NumberDataHandler,
        StringDataHandler,
        ColorDataHandler,
        createOrUpdateProperty) {
    "use strict";
    return function(dynamicObject, data, buffer, sourceUri) {
        //TODO EDSL Should we be validating all parameters here?

        var czmlBillboard = data.billboard;
        if (typeof czmlBillboard !== 'undefined') {
            var billboard;
            if (dynamicObject.hasOwnProperty('billboard')) {
                //Update existing billboard.
                billboard = dynamicObject.billboard;
            } else if (czmlBillboard.hasOwnProperty('image') ||
                       czmlBillboard.hasOwnProperty('show') ||
                       czmlBillboard.hasOwnProperty('scale') ||
                       czmlBillboard.hasOwnProperty('color') ||
                       czmlBillboard.hasOwnProperty('horizontalOrigin') ||
                       czmlBillboard.hasOwnProperty('verticalOrigin') ||
                       czmlBillboard.hasOwnProperty('rotation') ||
                       czmlBillboard.hasOwnProperty('pixelOffset') ||
                       czmlBillboard.hasOwnProperty('eyeOffset')) {
                //Create a new billboard.
                billboard = new DynamicBillboard();
                dynamicObject.billboard = billboard;
            } else {
                //No properties to process
                return;
            }

            billboard.color = createOrUpdateProperty(ColorDataHandler, czmlBillboard.color, buffer, sourceUri, billboard.color);
            billboard.eyeOffset = createOrUpdateProperty(Cartesian3DataHandler, czmlBillboard.eyeOffset, buffer, sourceUri, billboard.eyeOffset);
            billboard.horizontalOrigin = createOrUpdateProperty(StringDataHandler, czmlBillboard.horizontalOrigin, buffer, sourceUri, billboard.horizontalOrigin);
            billboard.image = createOrUpdateProperty(StringDataHandler, czmlBillboard.image, buffer, sourceUri, billboard.image);
            billboard.pixelOffset = createOrUpdateProperty(Cartesian2DataHandler, czmlBillboard.pixelOffset, buffer, sourceUri, billboard.pixelOffset);
            billboard.rotation = createOrUpdateProperty(NumberDataHandler, czmlBillboard.rotation, buffer, sourceUri, billboard.rotation);
            billboard.scale = createOrUpdateProperty(NumberDataHandler, czmlBillboard.scale, buffer, sourceUri, billboard.scale);
            billboard.show = createOrUpdateProperty(BooleanDataHandler, czmlBillboard.show, buffer, sourceUri, billboard.show);
            billboard.verticalOrigin = createOrUpdateProperty(StringDataHandler, czmlBillboard.verticalOrigin, buffer, sourceUri, billboard.verticalOrigin);
        }
    };
});