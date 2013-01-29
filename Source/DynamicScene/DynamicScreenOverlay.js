/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlCartesian2',
        './CzmlColor',
        './CzmlNumber',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        defaultValue,
        CzmlBoolean,
        CzmlCartesian2,
        CzmlColor,
        CzmlNumber,
        DynamicProperty,
        DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic screen overlay, typically used in conjunction with DynamicScreenOverlayVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicScreenOverlay
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicScreenOverlayVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicScreenOverlay = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the overlay's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian2 which determines the overlay's position at the lower left corner.
         * @type DynamicProperty
         */
        this.position = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the overlay's width.
         * @type DynamicProperty
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the overlay's height.
         * @type DynamicProperty
         */
        this.height = undefined;
        /**
         * A DynamicMaterialProperty which determines the material.
         * @type DynamicMaterialProperty
         */
        this.material = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's screenOverlay.
     * If the DynamicObject does not have a screenOverlay, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the screenOverlay data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObject} dynamicObjectCollection The DynamicObjectCollection to which the DynamicObject belongs.
     *
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicScreenOverlay.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var screenOverlayData = packet.screenOverlay;
        if (typeof screenOverlayData === 'undefined') {
            return false;
        }

        var screenOverlayUpdated = false;
        var screenOverlay = dynamicObject.screenOverlay;
        screenOverlayUpdated = typeof screenOverlay === 'undefined';
        if (screenOverlayUpdated) {
            dynamicObject.screenOverlay = screenOverlay = new DynamicScreenOverlay();
        }

        var interval = screenOverlayData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof screenOverlayData.show !== 'undefined') {
            var show = screenOverlay.show;
            if (typeof show === 'undefined') {
                screenOverlay.show = show = new DynamicProperty(CzmlBoolean);
                screenOverlayUpdated = true;
            }
            show.processCzmlIntervals(screenOverlayData.show, interval);
        }

        if (typeof screenOverlayData.position !== 'undefined') {
            var position = screenOverlay.position;
            if (typeof position === 'undefined') {
                screenOverlay.position = position = new DynamicProperty(CzmlCartesian2);
                screenOverlayUpdated = true;
            }
            position.processCzmlIntervals(screenOverlayData.position, interval);
        }

        if (typeof screenOverlayData.width !== 'undefined') {
            var width = screenOverlay.width;
            if (typeof width === 'undefined') {
                screenOverlay.width = width = new DynamicProperty(CzmlNumber);
                screenOverlayUpdated = true;
            }
            width.processCzmlIntervals(screenOverlayData.width, interval);
        }

        if (typeof screenOverlayData.height !== 'undefined') {
            var height = screenOverlay.height;
            if (typeof height === 'undefined') {
                screenOverlay.height = height = new DynamicProperty(CzmlNumber);
                screenOverlayUpdated = true;
            }
            height.processCzmlIntervals(screenOverlayData.height, interval);
        }

        if (typeof screenOverlayData.material !== 'undefined') {
            var material = screenOverlay.material;
            if (typeof material === 'undefined') {
                screenOverlay.material = material = new DynamicMaterialProperty();
                screenOverlayUpdated = true;
            }
            material.processCzmlIntervals(screenOverlayData.material, interval);
        }

        return screenOverlayUpdated;
    };

    /**
     * Given two DynamicObjects, takes the screenOverlay properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicScreenOverlay.mergeProperties = function(targetObject, objectToMerge) {
        var screenOverlayToMerge = objectToMerge.screenOverlay;
        if (typeof screenOverlayToMerge !== 'undefined') {

            var targetOverlayQuad = targetObject.screenOverlay;
            if (typeof targetOverlayQuad === 'undefined') {
                targetObject.screenOverlay = targetOverlayQuad = new DynamicScreenOverlay();
            }

            targetOverlayQuad.show = defaultValue(targetOverlayQuad.show, screenOverlayToMerge.show);
            targetOverlayQuad.position = defaultValue(targetOverlayQuad.position, screenOverlayToMerge.position);
            targetOverlayQuad.width = defaultValue(targetOverlayQuad.width, screenOverlayToMerge.width);
            targetOverlayQuad.height = defaultValue(targetOverlayQuad.height, screenOverlayToMerge.height);
            targetOverlayQuad.material = defaultValue(targetOverlayQuad.material, screenOverlayToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the screenOverlay associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the screenOverlay from.
     *
     * @see CzmlDefaults
     */
    DynamicScreenOverlay.undefineProperties = function(dynamicObject) {
        dynamicObject.screenOverlay = undefined;
    };

    return DynamicScreenOverlay;
});
