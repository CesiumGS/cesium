/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Color',
        './DynamicDirectionsProperty'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        Color,
        DynamicDirectionsProperty) {
    "use strict";

    /**
     * Represents a time-dynamic pyramid, typically used in conjunction with DynamicPyramidVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicPyramid
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicPyramidVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicPyramid = function() {
        /**
         * A DynamicProperty of type Boolean which determines the pyramid's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicDirectionsProperty which determines the projection of the pyramid.
         * @type {DynamicDirectionsProperty}
         * @default undefined
         */
        this.directions = undefined;
        /**
         * A DynamicProperty of type Number which determines the pyramid's radius.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.radius = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the pyramid's intersection visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.showIntersection = undefined;
        /**
         * A DynamicProperty of type Color which determines the color of the line formed by the intersection of the pyramid and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionColor = undefined;
        /**
         * A DynamicProperty of type Number which determines the approximate pixel width of the line formed by the intersection of the pyramid and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionWidth = undefined;
        /**
         * A DynamicMaterialProperty which determines the material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.material = undefined;
    };

    /**
     * Given two DynamicObjects, takes the pyramid properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicPyramid.mergeProperties = function(targetObject, objectToMerge) {
        var pyramidToMerge = objectToMerge.pyramid;
        if (defined(pyramidToMerge)) {

            var targetPyramid = targetObject.pyramid;
            if (!defined(targetPyramid)) {
                targetObject.pyramid = targetPyramid = new DynamicPyramid();
            }

            targetPyramid.show = defaultValue(targetPyramid.show, pyramidToMerge.show);
            targetPyramid.directions = defaultValue(targetPyramid.directions, pyramidToMerge.directions);
            targetPyramid.radius = defaultValue(targetPyramid.radius, pyramidToMerge.radius);
            targetPyramid.showIntersection = defaultValue(targetPyramid.showIntersection, pyramidToMerge.showIntersection);
            targetPyramid.intersectionColor = defaultValue(targetPyramid.intersectionColor, pyramidToMerge.intersectionColor);
            targetPyramid.intersectionWidth = defaultValue(targetPyramid.intersectionWidth, pyramidToMerge.intersectionWidth);
            targetPyramid.material = defaultValue(targetPyramid.material, pyramidToMerge.material);
        }
    };

    /**
     * Given a DynamicObject, undefines the pyramid associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the pyramid from.
     *
     * @see CzmlDefaults
     */
    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
