/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
       ], function(
         defaultValue,
         defined) {
    "use strict";

    /**
     * An optionally time-dynamic cone.
     *
     * @alias DynamicCone
     * @constructor
     */
    var DynamicCone = function() {
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's minimum clock angle.
         * @type {Property}
         */
        this.minimumClockAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's maximum clock angle.
         * @type {Property}
         */
        this.maximumClockAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's inner half-angle.
         * @type {Property}
         */
        this.innerHalfAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's outer half-angle.
         * @type {Property}
         */
        this.outerHalfAngle = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's cap material.
         * @type {MaterialProperty}
         */
        this.capMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's inner material.
         * @type {MaterialProperty}
         */
        this.innerMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's outer material.
         * @type {MaterialProperty}
         */
        this.outerMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's silhouette material.
         * @type {MaterialProperty}
         */
        this.silhouetteMaterial = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.intersectionColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.intersectionWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.showIntersection = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the cone's projection.
         * @type {Property}
         */
        this.radius = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the cone.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the cone properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicCone.mergeProperties = function(targetObject, objectToMerge) {
        var coneToMerge = objectToMerge.cone;
        if (defined(coneToMerge)) {

            var targetCone = targetObject.cone;
            if (!defined(targetCone)) {
                targetObject.cone = targetCone = new DynamicCone();
            }

            targetCone.show = defaultValue(targetCone.show, coneToMerge.show);
            targetCone.innerHalfAngle = defaultValue(targetCone.innerHalfAngle, coneToMerge.innerHalfAngle);
            targetCone.outerHalfAngle = defaultValue(targetCone.outerHalfAngle, coneToMerge.outerHalfAngle);
            targetCone.minimumClockAngle = defaultValue(targetCone.minimumClockAngle, coneToMerge.minimumClockAngle);
            targetCone.maximumClockAngle = defaultValue(targetCone.maximumClockAngle, coneToMerge.maximumClockAngle);
            targetCone.radius = defaultValue(targetCone.radius, coneToMerge.radius);
            targetCone.showIntersection = defaultValue(targetCone.showIntersection, coneToMerge.showIntersection);
            targetCone.intersectionColor = defaultValue(targetCone.intersectionColor, coneToMerge.intersectionColor);
            targetCone.intersectionWidth = defaultValue(targetCone.intersectionWidth, coneToMerge.intersectionWidth);
            targetCone.capMaterial = defaultValue(targetCone.capMaterial, coneToMerge.capMaterial);
            targetCone.innerMaterial = defaultValue(targetCone.innerMaterial, coneToMerge.innerMaterial);
            targetCone.outerMaterial = defaultValue(targetCone.outerMaterial, coneToMerge.outerMaterial);
            targetCone.silhouetteMaterial = defaultValue(targetCone.silhouetteMaterial, coneToMerge.silhouetteMaterial);
        }
    };

    /**
     * Given a DynamicObject, undefines the cone associated with it.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the cone from.
     */
    DynamicCone.undefineProperties = function(dynamicObject) {
        dynamicObject.cone = undefined;
    };

    return DynamicCone;
});
