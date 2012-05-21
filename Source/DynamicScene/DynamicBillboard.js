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

    DynamicBillboard.createOrUpdate = function(dynamicObject, packet, czmlObjectCollection, sourceUri) {
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

            var billboardUpdated = false;
            var billboard = dynamicObject.billboard;

            //Create a new billboard if we don't have one yet.
            if (typeof billboard === 'undefined') {
                billboard = new DynamicBillboard();
                dynamicObject.billboard = billboard;
                billboardUpdated = true;
            }

            var interval = billboardData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            //Create or update each of the properties.
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "color", ColorDataHandler, billboardData.color, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "eyeOffset", Cartesian3DataHandler, billboardData.eyeOffset, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "horizontalOrigin", StringDataHandler, billboardData.horizontalOrigin, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "image", StringDataHandler, billboardData.image, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "pixelOffset", Cartesian2DataHandler, billboardData.pixelOffset, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "rotation", NumberDataHandler, billboardData.rotation, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "scale", NumberDataHandler, billboardData.scale, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "show", BooleanDataHandler, billboardData.show, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "verticalOrigin", StringDataHandler, billboardData.verticalOrigin, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.createOrUpdate(billboard, "color", ColorDataHandler, billboardData.color, interval, czmlObjectCollection) || billboardUpdated;

            return billboardUpdated;
        }
    };

    DynamicBillboard.mergeProperties = function(existingObject, objectToMerge) {
        var billboardToMerge = objectToMerge.billboard;
        if (typeof billboardToMerge !== 'undefined') {
            var target = existingObject.billboard;
            if (typeof target === 'undefined') {
                target = new DynamicBillboard();
                existingObject.billboard = target;
            }
            target.color = target.color || billboardToMerge.color;
            target.eyeOffset = target.eyeOffset || billboardToMerge.eyeOffset;
            target.horizontalOrigin = target.horizontalOrigin || billboardToMerge.horizontalOrigin;
            target.image = target.image || billboardToMerge.image;
            target.pixelOffset = target.pixelOffset || billboardToMerge.pixelOffset;
            target.rotation = target.rotation || billboardToMerge.rotation;
            target.scale = target.scale || billboardToMerge.scale;
            target.show = target.show || billboardToMerge.show;
            target.verticalOrigin = target.verticalOrigin || billboardToMerge.verticalOrigin;
        }
    };

    DynamicBillboard.deleteProperties = function(existingObject) {
        existingObject.billboard = undefined;
    };

    return DynamicBillboard;
});