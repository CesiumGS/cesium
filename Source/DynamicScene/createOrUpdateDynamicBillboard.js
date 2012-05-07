/*global define*/
define(['./DynamicBillboard',
        './BooleanDataHandler',
        './Cartesian2DataHandler',
        './Cartesian3DataHandler',
        './NumberDataHandler',
        './StringDataHandler',
        './ColorDataHandler',
        './createOrUpdateProperty'],
function(DynamicBillboard,
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
        var billboardData = packet.billboard, billboard;
        if (typeof billboardData !== 'undefined' &&
            (typeof billboardData.image !== 'undefined' ||
             typeof billboardData.show !== 'undefined' ||
             typeof billboardData.scale !== 'undefined' ||
             typeof billboardData.color !== 'undefined' ||
             typeof billboardData.horizontalOrigin !== 'undefined' ||
             typeof billboardData.verticalOrigin !== 'undefined' ||
             typeof billboardData.rotation !== 'undefined' ||
             typeof billboardData.pixelOffset !== 'undefined' ||
             typeof billboardData.eyeOffset !== 'undefined')) {

            billboard = dynamicObject.billboard;

            //Create a new billboard if we don't have one yet.
            if (typeof billboard === 'undefined') {
                billboard = new DynamicBillboard();
                dynamicObject.billboard = billboard;
            }

            //Create or update each of the properties.
            billboard.color = createOrUpdateProperty(ColorDataHandler, billboardData.color, buffer, sourceUri, billboard.color);
            billboard.eyeOffset = createOrUpdateProperty(Cartesian3DataHandler, billboardData.eyeOffset, buffer, sourceUri, billboard.eyeOffset);
            billboard.horizontalOrigin = createOrUpdateProperty(StringDataHandler, billboardData.horizontalOrigin, buffer, sourceUri, billboard.horizontalOrigin);
            billboard.image = createOrUpdateProperty(StringDataHandler, billboardData.image, buffer, sourceUri, billboard.image);
            billboard.pixelOffset = createOrUpdateProperty(Cartesian2DataHandler, billboardData.pixelOffset, buffer, sourceUri, billboard.pixelOffset);
            billboard.rotation = createOrUpdateProperty(NumberDataHandler, billboardData.rotation, buffer, sourceUri, billboard.rotation);
            billboard.scale = createOrUpdateProperty(NumberDataHandler, billboardData.scale, buffer, sourceUri, billboard.scale);
            billboard.show = createOrUpdateProperty(BooleanDataHandler, billboardData.show, buffer, sourceUri, billboard.show);
            billboard.verticalOrigin = createOrUpdateProperty(StringDataHandler, billboardData.verticalOrigin, buffer, sourceUri, billboard.verticalOrigin);
        }
    };
});