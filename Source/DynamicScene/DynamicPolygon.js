/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
         TimeInterval,
         CzmlBoolean,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic polygon, typically used in conjunction with DynamicPolygonVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicPolygon
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
    function DynamicPolygon() {
        this.show = undefined;
        this.material = undefined;
    }

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's polygon.
     * If the DynamicObject does not have a polygon, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the polygon data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPolygon.processCzmlPacket = function(dynamicObject, packet) {
        var polygonData = packet.polygon;
        var polygonUpdated = false;
        if (typeof polygonData !== 'undefined') {
            var polygon = dynamicObject.polygon;
            polygonUpdated = typeof polygon === 'undefined';
            if (polygonUpdated) {
                dynamicObject.polygon = polygon = new DynamicPolygon();
            }

            var interval = polygonData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            polygonUpdated = DynamicProperty.processCzmlPacket(polygon, 'show', CzmlBoolean, polygonData.show, interval) || polygonUpdated;
            polygonUpdated = DynamicMaterialProperty.processCzmlPacket(polygon, 'material', polygonData.material, interval) || polygonUpdated;
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

            targetPolygon.show = targetPolygon.show || polygonToMerge.show;
            targetPolygon.material = targetPolygon.material || polygonToMerge.material;
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