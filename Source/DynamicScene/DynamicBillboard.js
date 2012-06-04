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

    DynamicBillboard.processCzmlPacket = function(dynamicObject, packet, czmlObjectCollection, sourceUri) {
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
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "color", CzmlColor, billboardData.color, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "eyeOffset", CzmlCartesian3, billboardData.eyeOffset, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "horizontalOrigin", CzmlString, billboardData.horizontalOrigin, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "image", CzmlString, billboardData.image, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "pixelOffset", CzmlCartesian2, billboardData.pixelOffset, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "rotation", CzmlNumber, billboardData.rotation, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "scale", CzmlNumber, billboardData.scale, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "show", CzmlBoolean, billboardData.show, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "verticalOrigin", CzmlString, billboardData.verticalOrigin, interval, czmlObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, "color", CzmlColor, billboardData.color, interval, czmlObjectCollection) || billboardUpdated;

            return billboardUpdated;
        }
    };

    DynamicBillboard.mergeProperties = function(targetObject, objectToMerge) {
        var billboardToMerge = objectToMerge.billboard;
        if (typeof billboardToMerge !== 'undefined') {
            var targetBillboard = targetObject.billboard;
            if (typeof targetBillboard === 'undefined') {
                targetBillboard = new DynamicBillboard();
                targetObject.billboard = targetBillboard;
            }
            targetBillboard.color = targetBillboard.color || billboardToMerge.color;
            targetBillboard.eyeOffset = targetBillboard.eyeOffset || billboardToMerge.eyeOffset;
            targetBillboard.horizontalOrigin = targetBillboard.horizontalOrigin || billboardToMerge.horizontalOrigin;
            targetBillboard.image = targetBillboard.image || billboardToMerge.image;
            targetBillboard.pixelOffset = targetBillboard.pixelOffset || billboardToMerge.pixelOffset;
            targetBillboard.rotation = targetBillboard.rotation || billboardToMerge.rotation;
            targetBillboard.scale = targetBillboard.scale || billboardToMerge.scale;
            targetBillboard.show = targetBillboard.show || billboardToMerge.show;
            targetBillboard.verticalOrigin = targetBillboard.verticalOrigin || billboardToMerge.verticalOrigin;
        }
    };

    DynamicBillboard.undefineProperties = function(dynamicObject) {
        dynamicObject.billboard = undefined;
    };

    return DynamicBillboard;
});