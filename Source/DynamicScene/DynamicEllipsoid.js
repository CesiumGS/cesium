/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic ellipsoid.
     *
     * @alias DynamicEllipsoid
     * @constructor
     */
    var DynamicEllipsoid = function() {
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the ellipsoid.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the radii of the ellipsoid.
         * @type {Property}
         */
        this.radii = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the ellipsoid.
         * @type {MaterialProperty}
         */
        this.material = undefined;
    };

    /**
     * Given two DynamicObjects, takes the ellipsoid properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
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
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the ellipsoid from.
     */
    DynamicEllipsoid.undefineProperties = function(dynamicObject) {
        dynamicObject.ellipsoid = undefined;
    };

    return DynamicEllipsoid;
});
