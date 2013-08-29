/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
         defaultValue,
         defined) {
    "use strict";

    /**
     * An optionally time-dynamic polygon.
     *
     * @alias DynamicPolygon
     * @constructor
     */
    var DynamicPolygon = function() {
        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @type {MaterialProperty}
         */
        this.material = undefined;
    };

    /**
     * Given two DynamicObjects, takes the polygon properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the polygon from.
     */
    DynamicPolygon.undefineProperties = function(dynamicObject) {
        dynamicObject.polygon = undefined;
    };

    return DynamicPolygon;
});
