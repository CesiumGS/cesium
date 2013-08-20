/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Color'],
function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian3,
        Color) {
    "use strict";

    /**
     * Represents a time-dynamic vector, typically used in conjunction with DynamicVectorVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicVector
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicVectorVisualizer
     * @see VisualizerCollection
     * @see CzmlDefaults
     */
    var DynamicVector = function() {
        /**
         * A DynamicProperty of type Color which determines the vector's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the vector's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type Number which determines the vector's width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the vector's direction.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.direction = undefined;
        /**
         * A DynamicProperty of type Number which determines the vector's graphical length.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.length = undefined;
    };

    /**
     * Given two DynamicObjects, takes the vector properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicVector.mergeProperties = function(targetObject, objectToMerge) {
        var vectorToMerge = objectToMerge.vector;
        if (defined(vectorToMerge)) {

            var targetVector = targetObject.vector;
            if (!defined(targetVector)) {
                targetObject.vector = targetVector = new DynamicVector();
            }

            targetVector.color = defaultValue(targetVector.color, vectorToMerge.color);
            targetVector.width = defaultValue(targetVector.width, vectorToMerge.width);
            targetVector.direction = defaultValue(targetVector.direction, vectorToMerge.direction);
            targetVector.length = defaultValue(targetVector.length, vectorToMerge.length);
            targetVector.show = defaultValue(targetVector.show, vectorToMerge.show);
        }
    };

    /**
     * Given a DynamicObject, undefines the vector associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the vector from.
     *
     * @see CzmlDefaults
     */
    DynamicVector.undefineProperties = function(dynamicObject) {
        dynamicObject.vector = undefined;
    };

    return DynamicVector;
});
