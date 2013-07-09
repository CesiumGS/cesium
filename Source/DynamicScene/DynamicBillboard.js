/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlCartesian3',
        './CzmlNumber',
        './CzmlImage',
        './CzmlHorizontalOrigin',
        './CzmlVerticalOrigin',
        './CzmlColor',
        './DynamicProperty'
    ], function(
        TimeInterval,
        defaultValue,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlCartesian3,
        CzmlNumber,
        CzmlImage,
        CzmlHorizontalOrigin,
        CzmlVerticalOrigin,
        CzmlColor,
        DynamicProperty) {
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
        if (typeof billboardData === 'undefined') {
            return false;
        }

        var billboardUpdated = false;
        var billboard = dynamicObject.billboard;
        billboardUpdated = typeof billboard === 'undefined';
        if (billboardUpdated) {
            dynamicObject.billboard = billboard = new DynamicBillboard();
        }

        var interval = billboardData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof billboardData.color !== 'undefined') {
            var color = billboard.color;
            if (typeof color === 'undefined') {
                billboard.color = color = new DynamicProperty(CzmlColor);
                billboardUpdated = true;
            }
            color.processCzmlIntervals(billboardData.color, interval);
        }

        if (typeof billboardData.eyeOffset !== 'undefined') {
            var eyeOffset = billboard.eyeOffset;
            if (typeof eyeOffset === 'undefined') {
                billboard.eyeOffset = eyeOffset = new DynamicProperty(CzmlCartesian3);
                billboardUpdated = true;
            }
            eyeOffset.processCzmlIntervals(billboardData.eyeOffset, interval);
        }

        if (typeof billboardData.horizontalOrigin !== 'undefined') {
            var horizontalOrigin = billboard.horizontalOrigin;
            if (typeof horizontalOrigin === 'undefined') {
                billboard.horizontalOrigin = horizontalOrigin = new DynamicProperty(CzmlHorizontalOrigin);
                billboardUpdated = true;
            }
            horizontalOrigin.processCzmlIntervals(billboardData.horizontalOrigin, interval);
        }

        if (typeof billboardData.image !== 'undefined') {
            var image = billboard.image;
            if (typeof image === 'undefined') {
                billboard.image = image = new DynamicProperty(CzmlImage);
                billboardUpdated = true;
            }
            image.processCzmlIntervals(billboardData.image, interval, sourceUri);
        }

        if (typeof billboardData.pixelOffset !== 'undefined') {
            var pixelOffset = billboard.pixelOffset;
            if (typeof pixelOffset === 'undefined') {
                billboard.pixelOffset = pixelOffset = new DynamicProperty(CzmlCartesian2);
                billboardUpdated = true;
            }
            pixelOffset.processCzmlIntervals(billboardData.pixelOffset, interval);
        }

        if (typeof billboardData.scale !== 'undefined') {
            var scale = billboard.scale;
            if (typeof scale === 'undefined') {
                billboard.scale = scale = new DynamicProperty(CzmlNumber);
                billboardUpdated = true;
            }
            scale.processCzmlIntervals(billboardData.scale, interval);
        }

        if (typeof billboardData.show !== 'undefined') {
            var show = billboard.show;
            if (typeof show === 'undefined') {
                billboard.show = show = new DynamicProperty(CzmlBoolean);
                billboardUpdated = true;
            }
            show.processCzmlIntervals(billboardData.show, interval);
        }

        if (typeof billboardData.verticalOrigin !== 'undefined') {
            var verticalOrigin = billboard.verticalOrigin;
            if (typeof verticalOrigin === 'undefined') {
                billboard.verticalOrigin = verticalOrigin = new DynamicProperty(CzmlVerticalOrigin);
                billboardUpdated = true;
            }
            verticalOrigin.processCzmlIntervals(billboardData.verticalOrigin, interval);
        }

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
        if (typeof billboardToMerge !== 'undefined') {

            var targetBillboard = targetObject.billboard;
            if (typeof targetBillboard === 'undefined') {
                targetObject.billboard = targetBillboard = new DynamicBillboard();
            }

            targetBillboard.color = defaultValue(targetBillboard.color, billboardToMerge.color);
            targetBillboard.eyeOffset = defaultValue(targetBillboard.eyeOffset, billboardToMerge.eyeOffset);
            targetBillboard.horizontalOrigin = defaultValue(targetBillboard.horizontalOrigin, billboardToMerge.horizontalOrigin);
            targetBillboard.image = defaultValue(targetBillboard.image, billboardToMerge.image);
            targetBillboard.pixelOffset = defaultValue(targetBillboard.pixelOffset, billboardToMerge.pixelOffset);
            targetBillboard.scale = defaultValue(targetBillboard.scale, billboardToMerge.scale);
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
