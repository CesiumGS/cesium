/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic pyramid.
     *
     * @alias DynamicPyramid
     * @constructor
     */
    var DynamicPyramid = function() {
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
         * @type {Property}
         * @default undefined
         */
        this.directions = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
         * @type {Property}
         */
        this.radius = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.showIntersection = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.intersectionColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.intersectionWidth = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
         * @type {MaterialProperty}
         */
        this.material = undefined;
    };

    /**
     * Given two DynamicObjects, takes the pyramid properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the pyramid from.
     */
    DynamicPyramid.undefineProperties = function(dynamicObject) {
        dynamicObject.pyramid = undefined;
    };

    return DynamicPyramid;
});
