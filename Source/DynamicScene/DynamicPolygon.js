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
     * An optionally time-dynamic polygon.
     *
     * @alias DynamicPolygon
     * @constructor
     */
    var DynamicPolygon = function() {
        this._show = undefined;
        this._material = undefined;
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicPolygon.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPolygon.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @memberof DynamicPolygon.prototype
         * @type {Property}
         */
        show : createObservableProperty('show', '_show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @memberof DynamicPolygon.prototype
         * @type {MaterialProperty}
         */
        material : createObservableProperty('material', '_material')
    });

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPolygon} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPolygon.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
    };

    return DynamicPolygon;
});
