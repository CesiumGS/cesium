/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
         TimeInterval,
         defaultValue,
         CzmlBoolean,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic polygon, typically used in conjunction with DynamicPolygonVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPolygon
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPolygonVisualizer
     * @see VisualizerCollection
     * @see Polygon
     * @see CzmlDefaults
     */
    var DynamicPolygon = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the polygon's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicMaterialProperty which determines the polygon's material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.material = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's polygon.
     * If the DynamicObject does not have a polygon, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the polygon data.
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
    DynamicPolygon.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var polygonData = packet.polygon;
        if (typeof polygonData === 'undefined') {
            return false;
        }

        var polygonUpdated = false;
        var polygon = dynamicObject.polygon;
        polygonUpdated = typeof polygon === 'undefined';
        if (polygonUpdated) {
            dynamicObject.polygon = polygon = new DynamicPolygon();
        }

        var interval = polygonData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof polygonData.show !== 'undefined') {
            var show = polygon.show;
            if (typeof show === 'undefined') {
                polygon.show = show = new DynamicProperty(CzmlBoolean);
                polygonUpdated = true;
            }
            show.processCzmlIntervals(polygonData.show, interval);
        }

        if (typeof polygonData.material !== 'undefined') {
            var material = polygon.material;
            if (typeof material === 'undefined') {
                polygon.material = material = new DynamicMaterialProperty();
                polygonUpdated = true;
            }
            material.processCzmlIntervals(polygonData.material, interval, sourceUri);
        }
        return polygonUpdated;
    };

    /**
     * Given two DynamicObjects, takes the polygon properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicPolygon.mergeProperties = function(targetObject, objectToMerge) {
        var polygonToMerge = objectToMerge.polygon;
        if (typeof polygonToMerge !== 'undefined') {

            var targetPolygon = targetObject.polygon;
            if (typeof targetPolygon === 'undefined') {
                targetObject.polygon = targetPolygon = new DynamicPolygon();
            }

            targetPolygon.show = defaultValue(targetPolygon.show, polygonToMerge.show);
            targetPolygon.material = defaultValue(targetPolygon.material, polygonToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the polygon associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polygon from.
     *
     * @see CzmlDefaults
     */
    DynamicPolygon.undefineProperties = function(dynamicObject) {
        dynamicObject.polygon = undefined;
    };

    return DynamicPolygon;
});
