/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createDynamicPropertyDescriptor) {
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
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicPolygon.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPolygon.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @memberof DynamicPolygon.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show', '_show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @memberof DynamicPolygon.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material', '_material')
    });

    /**
     * Duplicates a DynamicPolygon instance.
     * @memberof DynamicPolygon
     *
     * @param {DynamicPolygon} [result] The object onto which to store the result.
     * @returns {DynamicPolygon} The modified result parameter or a new instance if one was not provided.
     */
    DynamicPolygon.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicPolygon();
        }
        result.show = this.show;
        result.material = this.material;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicPolygon
     *
     * @param {DynamicPolygon} source The object to be merged into this object.
     */
    DynamicPolygon.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
    };

    return DynamicPolygon;
});
