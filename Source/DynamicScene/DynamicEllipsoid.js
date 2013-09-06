/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createObservableProperty'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createObservableProperty) {
    "use strict";

    /**
     * An optionally time-dynamic ellipsoid.
     *
     * @alias DynamicEllipsoid
     * @constructor
     */
    var DynamicEllipsoid = function() {
        this._show = undefined;
        this._radii = undefined;
        this._material = undefined;
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicEllipsoid.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicEllipsoid.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        show : createObservableProperty('show', '_show'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the radii of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        radii : createObservableProperty('radii', '_radii'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {MaterialProperty}
         */
        material : createObservableProperty('material', '_material')
    });

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
