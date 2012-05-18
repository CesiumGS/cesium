/*global define*/
define([
        '../Core/TimeInterval',
        './BooleanDataHandler',
        './Cartesian2DataHandler',
        './Cartesian3DataHandler',
        './NumberDataHandler',
        './StringDataHandler',
        './ColorDataHandler',
        './DynamicProperty'
    ], function(
        TimeInterval,
        BooleanDataHandler,
        Cartesian2DataHandler,
        Cartesian3DataHandler,
        NumberDataHandler,
        StringDataHandler,
        ColorDataHandler,
        DynamicProperty) {
    "use strict";

    function DynamicBillboard() {
        this.image = undefined;
        this.scale = undefined;
        this.horizontalOrigin = undefined;
        this.verticalOrigin = undefined;
        this.color = undefined;
        this.eyeOffset = undefined;
        this.pixelOffset = undefined;
        this.show = undefined;
    }

    DynamicBillboard.createOrUpdate = function(dynamicObject, packet, buffer, sourceUri) {
        //See if there's any actual data to process.
        var billboardData = packet.billboard;
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

            var billboard = dynamicObject.billboard;

            //Create a new billboard if we don't have one yet.
            if (typeof billboard === 'undefined') {
                billboard = new DynamicBillboard();
                dynamicObject.billboard = billboard;
            }

            var interval = billboardData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            billboard.color = DynamicProperty.createOrUpdate(ColorDataHandler, billboardData.color, buffer, sourceUri, billboard.color, interval);
            billboard.eyeOffset = DynamicProperty.createOrUpdate(Cartesian3DataHandler, billboardData.eyeOffset, buffer, sourceUri, billboard.eyeOffset, interval);
            billboard.horizontalOrigin = DynamicProperty.createOrUpdate(StringDataHandler, billboardData.horizontalOrigin, buffer, sourceUri, billboard.horizontalOrigin, interval);
            billboard.image = DynamicProperty.createOrUpdate(StringDataHandler, billboardData.image, buffer, sourceUri, billboard.image, interval);
            billboard.pixelOffset = DynamicProperty.createOrUpdate(Cartesian2DataHandler, billboardData.pixelOffset, buffer, sourceUri, billboard.pixelOffset, interval);
            billboard.rotation = DynamicProperty.createOrUpdate(NumberDataHandler, billboardData.rotation, buffer, sourceUri, billboard.rotation, interval);
            billboard.scale = DynamicProperty.createOrUpdate(NumberDataHandler, billboardData.scale, buffer, sourceUri, billboard.scale, interval);
            billboard.show = DynamicProperty.createOrUpdate(BooleanDataHandler, billboardData.show, buffer, sourceUri, billboard.show, interval);
            billboard.verticalOrigin = DynamicProperty.createOrUpdate(StringDataHandler, billboardData.verticalOrigin, buffer, sourceUri, billboard.verticalOrigin, interval);
        }
    };

    return DynamicBillboard;
});