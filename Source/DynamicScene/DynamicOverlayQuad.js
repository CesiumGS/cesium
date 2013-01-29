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
     * Represents a time-dynamic Overlay Quad, typically used in conjunction with DynamicOverlayQuadVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicOverlayQuad
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicOverlayQuadVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicOverlayQuad = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the overlayQuads's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian2 which determines the overlayQuads's position at the lower left corner.
         * @type DynamicProperty
         */
        this.position = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the overlayQuads's width.
         * @type DynamicProperty
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the overlayQuads's height.
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
     * Processes a single CZML packet and merges its data into the provided DynamicObject's overlayQuad.
     * If the DynamicObject does not have a overlayQuad, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the overlayQuad data.
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
    DynamicOverlayQuad.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection) {
        var overlayQuadData = packet.overlayQuad;
        if (typeof overlayQuadData === 'undefined') {
            return false;
        }

        var overlayQuadUpdated = false;
        var overlayQuad = dynamicObject.overlayQuad;
        overlayQuadUpdated = typeof overlayQuad === 'undefined';
        if (overlayQuadUpdated) {
            dynamicObject.overlayQuad = overlayQuad = new DynamicOverlayQuad();
        }

        var interval = overlayQuadData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof overlayQuadData.show !== 'undefined') {
            var show = overlayQuad.show;
            if (typeof show === 'undefined') {
                overlayQuad.show = show = new DynamicProperty(CzmlBoolean);
                overlayQuadUpdated = true;
            }
            show.processCzmlIntervals(overlayQuadData.show, interval);
        }

        if (typeof overlayQuadData.position !== 'undefined') {
            var position = overlayQuad.position;
            if (typeof position === 'undefined') {
                overlayQuad.position = position = new DynamicProperty(CzmlCartesian2);
                overlayQuadUpdated = true;
            }
            position.processCzmlIntervals(overlayQuadData.position, interval);
        }

        if (typeof overlayQuadData.width !== 'undefined') {
            var width = overlayQuad.width;
            if (typeof width === 'undefined') {
                overlayQuad.width = width = new DynamicProperty(CzmlNumber);
                overlayQuadUpdated = true;
            }
            width.processCzmlIntervals(overlayQuadData.width, interval);
        }

        if (typeof overlayQuadData.height !== 'undefined') {
            var height = overlayQuad.height;
            if (typeof height === 'undefined') {
                overlayQuad.height = height = new DynamicProperty(CzmlNumber);
                overlayQuadUpdated = true;
            }
            height.processCzmlIntervals(overlayQuadData.height, interval);
        }

        if (typeof overlayQuadData.material !== 'undefined') {
            var material = overlayQuad.material;
            if (typeof material === 'undefined') {
                overlayQuad.material = material = new DynamicMaterialProperty();
                overlayQuadUpdated = true;
            }
            material.processCzmlIntervals(overlayQuadData.material, interval);
        }

        return overlayQuadUpdated;
    };

    /**
     * Given two DynamicObjects, takes the overlayQuad properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicOverlayQuad.mergeProperties = function(targetObject, objectToMerge) {
        var overlayQuadToMerge = objectToMerge.overlayQuad;
        if (typeof overlayQuadToMerge !== 'undefined') {

            var targetOverlayQuad = targetObject.overlayQuad;
            if (typeof targetOverlayQuad === 'undefined') {
                targetObject.overlayQuad = targetOverlayQuad = new DynamicOverlayQuad();
            }

            targetOverlayQuad.show = defaultValue(targetOverlayQuad.show, overlayQuadToMerge.show);
            targetOverlayQuad.position = defaultValue(targetOverlayQuad.position, overlayQuadToMerge.position);
            targetOverlayQuad.width = defaultValue(targetOverlayQuad.width, overlayQuadToMerge.width);
            targetOverlayQuad.height = defaultValue(targetOverlayQuad.height, overlayQuadToMerge.height);
            targetOverlayQuad.material = defaultValue(targetOverlayQuad.material, overlayQuadToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the overlayQuad associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the overlayQuad from.
     *
     * @see CzmlDefaults
     */
    DynamicOverlayQuad.undefineProperties = function(dynamicObject) {
        dynamicObject.overlayQuad = undefined;
    };

    return DynamicOverlayQuad;
});
