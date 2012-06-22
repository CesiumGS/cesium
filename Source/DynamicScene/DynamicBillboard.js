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

    /**
     * Represents a time-dynamic billboard, typically used in conjunction with DynamicBillboardVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicBillboard
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see VisualizerCollection
     * @see Billboard
     * @see BillboardCollection
     * @see CzmlDefaults
     */
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

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's billboard.
     * If the DynamicObject does not have a billboard, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the billboard data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicBillboard.processCzmlPacket = function(dynamicObject, packet) {
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
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'color', CzmlColor, billboardData.color, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'eyeOffset', CzmlCartesian3, billboardData.eyeOffset, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'horizontalOrigin', CzmlHorizontalOrigin, billboardData.horizontalOrigin, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'image', CzmlString, billboardData.image, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'pixelOffset', CzmlCartesian2, billboardData.pixelOffset, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'scale', CzmlNumber, billboardData.scale, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'show', CzmlBoolean, billboardData.show, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'verticalOrigin', CzmlVerticalOrigin, billboardData.verticalOrigin, interval) || billboardUpdated;
            billboardUpdated = DynamicProperty.processCzmlPacket(billboard, 'color', CzmlColor, billboardData.color, interval) || billboardUpdated;
        }
        return billboardUpdated;
    };

    /**
     * Given two DynamicObjects, takes the billboard properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
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

    /**
     * Given a DynamicObject, undefines the billboard associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the billboard from.
     *
     * @see CzmlDefaults
     */
    DynamicBillboard.undefineProperties = function(dynamicObject) {
        dynamicObject.billboard = undefined;
    };

    return DynamicBillboard;
});