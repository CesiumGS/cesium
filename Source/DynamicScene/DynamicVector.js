/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic vector.
     * @alias DynamicVector
     * @constructor
     */
    var DynamicVector = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the vector's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the vector's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the vector's width.
         * @type {Property}
         */
        this.width = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the the vector's direction.
         * @type {Property}
         */
        this.direction = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the vector's graphical length in meters.
         * @type {Property}
         */
        this.length = undefined;
    };

    /**
     * Given two DynamicObjects, takes the vector properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the vector from.
     */
    DynamicVector.undefineProperties = function(dynamicObject) {
        dynamicObject.vector = undefined;
    };

    return DynamicVector;
});
