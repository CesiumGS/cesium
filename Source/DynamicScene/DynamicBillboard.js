/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlImage',
        './CzmlHorizontalOrigin',
        './CzmlVerticalOrigin',
        './CzmlColor',
        './processPacketData'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlImage,
        CzmlHorizontalOrigin,
        CzmlVerticalOrigin,
        CzmlColor,
        processPacketData) {
    "use strict";

    /**
     * Represents a time-dynamic billboard, typically used in conjunction with DynamicBillboardVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicBillboard
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
    var DynamicBillboard = function() {
        /**
         * A DynamicProperty of type CzmlImage which determines the billboard's texture.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.image = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the billboard's scale.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.scale = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the billboard's rotation.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rotation = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian3 which determines the billboard's aligned axis.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.alignedAxis = undefined;
        /**
         * A DynamicProperty of type CzmlHorizontalOrigin which determines the billboard's horizontal origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalOrigin = undefined;
        /**
         * A DynamicProperty of type CzmlVerticalHorigin which determines the billboard's vertical origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalOrigin = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the billboard's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian3 which determines the billboard's eye offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.eyeOffset = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian2 which determines the billboard's pixel offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.pixelOffset = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the billboard's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's billboard.
     * If the DynamicObject does not have a billboard, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the billboard data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The collection into which objects are being loaded.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicBillboard.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var billboardData = packet.billboard;
        if (!defined(billboardData)) {
            return false;
        }

        var interval = billboardData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var billboard = dynamicObject.billboard;
        var billboardUpdated = !defined(billboard);
        if (billboardUpdated) {
            dynamicObject.billboard = billboard = new DynamicBillboard();
        }

        billboardUpdated = processPacketData(CzmlColor, billboard, 'color', billboardData.color, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlCartesian3, billboard, 'eyeOffset', billboardData.eyeOffset, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlHorizontalOrigin, billboard, 'horizontalOrigin', billboardData.horizontalOrigin, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlImage, billboard, 'image', billboardData.image, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlCartesian2, billboard, 'pixelOffset', billboardData.pixelOffset, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlNumber, billboard, 'scale', billboardData.scale, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlNumber, billboard, 'rotation', billboardData.rotation, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlCartesian3, billboard, 'alignedAxis', billboardData.alignedAxis, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlBoolean, billboard, 'show', billboardData.show, interval, sourceUri) || billboardUpdated;
        billboardUpdated = processPacketData(CzmlVerticalOrigin, billboard, 'verticalOrigin', billboardData.verticalOrigin, interval, sourceUri) || billboardUpdated;

        return billboardUpdated;
    };

    /**
     * Given two DynamicObjects, takes the billboard properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicBillboard.mergeProperties = function(targetObject, objectToMerge) {
        var billboardToMerge = objectToMerge.billboard;
        if (defined(billboardToMerge)) {

            var targetBillboard = targetObject.billboard;
            if (!defined(targetBillboard)) {
                targetObject.billboard = targetBillboard = new DynamicBillboard();
            }

            targetBillboard.color = defaultValue(targetBillboard.color, billboardToMerge.color);
            targetBillboard.eyeOffset = defaultValue(targetBillboard.eyeOffset, billboardToMerge.eyeOffset);
            targetBillboard.horizontalOrigin = defaultValue(targetBillboard.horizontalOrigin, billboardToMerge.horizontalOrigin);
            targetBillboard.image = defaultValue(targetBillboard.image, billboardToMerge.image);
            targetBillboard.pixelOffset = defaultValue(targetBillboard.pixelOffset, billboardToMerge.pixelOffset);
            targetBillboard.scale = defaultValue(targetBillboard.scale, billboardToMerge.scale);
            targetBillboard.rotation = defaultValue(targetBillboard.rotation, billboardToMerge.rotation);
            targetBillboard.alignedAxis = defaultValue(targetBillboard.alignedAxis, billboardToMerge.alignedAxis);
            targetBillboard.show = defaultValue(targetBillboard.show, billboardToMerge.show);
            targetBillboard.verticalOrigin = defaultValue(targetBillboard.verticalOrigin, billboardToMerge.verticalOrigin);
        }
    };

    /**
     * Given a DynamicObject, undefines the billboard associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     * @memberof DynamicBillboard
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
