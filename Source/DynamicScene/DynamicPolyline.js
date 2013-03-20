/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlNumber',
        './DynamicProperty',
        './DynamicMaterialProperty'
    ], function(
        TimeInterval,
        defaultValue,
        CzmlBoolean,
        CzmlNumber,
        DynamicProperty,
        DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic polyline, typically used in conjunction with DynamicPolylineVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPolyline
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPolylineVisualizer
     * @see VisualizerCollection
     * @see Polyline
     * @see CzmlDefaults
     */
    var DynamicPolyline = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the lines's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the line's width.
         * @type DynamicProperty
         */
        this.width = undefined;
        /**
         * A DynamicMaterialProperty which determines the line's material.
         * @type DynamicMaterialProperty
         */
        this.material = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's polyline.
     * If the DynamicObject does not have a polyline, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the polyline data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPolyline.processCzmlPacket = function(dynamicObject, packet) {
        var polylineData = packet.polyline;
        if (typeof polylineData === 'undefined') {
            return false;
        }

        var polylineUpdated = false;
        var polyline = dynamicObject.polyline;
        polylineUpdated = typeof polyline === 'undefined';
        if (polylineUpdated) {
            dynamicObject.polyline = polyline = new DynamicPolyline();
        }

        var interval = polylineData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof polylineData.width !== 'undefined') {
            var width = polyline.width;
            if (typeof width === 'undefined') {
                polyline.width = width = new DynamicProperty(CzmlNumber);
                polylineUpdated = true;
            }
            width.processCzmlIntervals(polylineData.width, interval);
        }

        if (typeof polylineData.show !== 'undefined') {
            var show = polyline.show;
            if (typeof show === 'undefined') {
                polyline.show = show = new DynamicProperty(CzmlBoolean);
                polylineUpdated = true;
            }
            show.processCzmlIntervals(polylineData.show, interval);
        }

        if (typeof polylineData.material !== 'undefined') {
            var material = polyline.material;
            if (typeof material === 'undefined') {
                polyline.material = material = new DynamicMaterialProperty();
                polylineUpdated = true;
            }
            material.processCzmlIntervals(polylineData.material, interval);
        }
        return polylineUpdated;
    };

    /**
     * Given two DynamicObjects, takes the polyline properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicPolyline.mergeProperties = function(targetObject, objectToMerge) {
        var polylineToMerge = objectToMerge.polyline;
        if (typeof polylineToMerge !== 'undefined') {

            var targetPolyline = targetObject.polyline;
            if (typeof targetPolyline === 'undefined') {
                targetObject.polyline = targetPolyline = new DynamicPolyline();
            }

            targetPolyline.width = defaultValue(targetPolyline.width, polylineToMerge.width);
            targetPolyline.show = defaultValue(targetPolyline.show, polylineToMerge.show);
            targetPolyline.material = defaultValue(targetPolyline.material, polylineToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the polyline associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polyline from.
     *
     * @see CzmlDefaults
     */
    DynamicPolyline.undefineProperties = function(dynamicObject) {
        dynamicObject.polyline = undefined;
    };

    return DynamicPolyline;
});