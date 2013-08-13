/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlCartesian3',
        './processPacketData',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        CzmlBoolean,
        CzmlCartesian3,
        processPacketData,
        DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic ellipsoid, typically used in conjunction with DynamicEllipsoidVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicEllipsoid
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicEllipsoidVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicEllipsoid = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the ellipsoid's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian3 which determines the ellipsoid's radii.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.radii = undefined;
        /**
         * A DynamicMaterialProperty which determines the material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.material = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's ellipsoid.
     * If the DynamicObject does not have a ellipsoid, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the ellipsoid data.
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
    DynamicEllipsoid.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var ellipsoidData = packet.ellipsoid;
        if (!defined(ellipsoidData)) {
            return false;
        }

        var interval = ellipsoidData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var ellipsoid = dynamicObject.ellipsoid;
        var ellipsoidUpdated = !defined(ellipsoid);
        if (ellipsoidUpdated) {
            dynamicObject.ellipsoid = ellipsoid = new DynamicEllipsoid();
        }

        ellipsoidUpdated = processPacketData(CzmlBoolean, ellipsoid, 'show', ellipsoidData.show, interval, sourceUri) || ellipsoidUpdated;
        ellipsoidUpdated = processPacketData(CzmlCartesian3, ellipsoid, 'radii', ellipsoidData.radii, interval, sourceUri) || ellipsoidUpdated;

        if (defined(ellipsoidData.material)) {
            var material = ellipsoid.material;
            if (!defined(material)) {
                ellipsoid.material = material = new DynamicMaterialProperty();
                ellipsoidUpdated = true;
            }
            material.processCzmlIntervals(ellipsoidData.material, interval);
        }

        return ellipsoidUpdated;
    };

    /**
     * Given two DynamicObjects, takes the ellipsoid properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicEllipsoid.mergeProperties = function(targetObject, objectToMerge) {
        var ellipsoidToMerge = objectToMerge.ellipsoid;
        if (defined(ellipsoidToMerge)) {

            var targetEllipsoid = targetObject.ellipsoid;
            if (!defined(targetEllipsoid)) {
                targetObject.ellipsoid = targetEllipsoid = new DynamicEllipsoid();
            }

            targetEllipsoid.show = defaultValue(targetEllipsoid.show, ellipsoidToMerge.show);
            targetEllipsoid.radii = defaultValue(targetEllipsoid.radii, ellipsoidToMerge.radii);
            targetEllipsoid.material = defaultValue(targetEllipsoid.material, ellipsoidToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the ellipsoid associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the ellipsoid from.
     *
     * @see CzmlDefaults
     */
    DynamicEllipsoid.undefineProperties = function(dynamicObject) {
        dynamicObject.ellipsoid = undefined;
    };

    return DynamicEllipsoid;
});
