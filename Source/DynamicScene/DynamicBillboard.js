/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlString',
        './CzmlHorizontalOrigin',
        './CzmlVerticalOrigin',
        './CzmlColor',
        './DynamicProperty'
    ], function(
        TimeInterval,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlString,
        CzmlHorizontalOrigin,
        CzmlVerticalOrigin,
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

    DynamicBillboard.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var billboardUpdated = false;
        var billboardData = packet.billboard;
        if (typeof billboardData !== 'undefined') {

            var billboard = dynamicObject.billboard;
            billboardUpdated = typeof billboard === 'undefined';
            if (billboardUpdated) {
                dynamicObject.billboard = billboard = new DynamicBillboard();
            }

            var interval = billboardData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'color', CzmlColor, billboardData.color, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'eyeOffset', CzmlCartesian3, billboardData.eyeOffset, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'horizontalOrigin', CzmlHorizontalOrigin, billboardData.horizontalOrigin, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'image', CzmlString, billboardData.image, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'pixelOffset', CzmlCartesian2, billboardData.pixelOffset, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'scale', CzmlNumber, billboardData.scale, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'show', CzmlBoolean, billboardData.show, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'verticalOrigin', CzmlVerticalOrigin, billboardData.verticalOrigin, interval, dynamicObjectCollection) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'color', CzmlColor, billboardData.color, interval, dynamicObjectCollection) || billboardUpdated;
        }
        return billboardUpdated;
    };

    DynamicBillboard.mergeProperties = function(targetObject, objectToMerge) {
        var billboardToMerge = objectToMerge.billboard;
        if (typeof billboardToMerge !== 'undefined') {

            var targetBillboard = targetObject.billboard;
            if (typeof targetBillboard === 'undefined') {
                targetObject.billboard = targetBillboard = new DynamicBillboard();
            }

            targetBillboard.color = targetBillboard.color || billboardToMerge.color;
            targetBillboard.eyeOffset = targetBillboard.eyeOffset || billboardToMerge.eyeOffset;
            targetBillboard.horizontalOrigin = targetBillboard.horizontalOrigin || billboardToMerge.horizontalOrigin;
            targetBillboard.image = targetBillboard.image || billboardToMerge.image;
            targetBillboard.pixelOffset = targetBillboard.pixelOffset || billboardToMerge.pixelOffset;
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