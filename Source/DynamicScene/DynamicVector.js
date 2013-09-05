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
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicVector} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicVector.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.color = defaultValue(this.color, source.color);
        this.width = defaultValue(this.width, source.width);
        this.direction = defaultValue(this.direction, source.direction);
        this.length = defaultValue(this.length, source.length);
        this.show = defaultValue(this.show, source.show);
    };

    return DynamicVector;
});
