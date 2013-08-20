/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian3) {
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
         * A DynamicProperty of type Boolean which determines the ellipsoid's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the ellipsoid's radii.
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
