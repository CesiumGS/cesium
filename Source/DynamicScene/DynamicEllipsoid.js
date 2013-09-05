/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event) {
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
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicEllipsoid} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicEllipsoid.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.show = defaultValue(this.show, source.show);
        this.radii = defaultValue(this.radii, source.radii);
        this.material = defaultValue(this.material, source.material);
    };

    return DynamicEllipsoid;
});
