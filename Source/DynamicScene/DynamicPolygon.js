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
     * An optionally time-dynamic polygon.
     *
     * @alias DynamicPolygon
     * @constructor
     */
    var DynamicPolygon = function() {
        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @type {MaterialProperty}
         */
        this.material = undefined;
    };

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
