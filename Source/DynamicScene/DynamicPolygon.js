/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
         TimeInterval,
         defaultValue,
         defined) {
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
     */
    var DynamicPolygon = function() {
        /**
         * A DynamicProperty of type Boolean which determines the polygon's visibility.
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
     * Given two DynamicObjects, takes the polygon properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicPolygon.mergeProperties = function(targetObject, objectToMerge) {
        var polygonToMerge = objectToMerge.polygon;
        if (defined(polygonToMerge)) {

            var targetPolygon = targetObject.polygon;
            if (!defined(targetPolygon)) {
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
     */
    DynamicPolygon.undefineProperties = function(dynamicObject) {
        dynamicObject.polygon = undefined;
    };

    return DynamicPolygon;
});
