/*global define*/
define([
        '../Core/defaultValue',
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
     * An optionally time-dynamic vector.
     * @alias DynamicVector
     * @constructor
     */
    var DynamicVector = function() {
        this._color = undefined;
        this._colorSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._direction = undefined;
        this._directionSubscription = undefined;
        this._length = undefined;
        this._lengthSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicVector.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicVector.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the vector's color.
         * @memberof DynamicVector.prototype
         * @type {Property}
         */
        color : createDynamicPropertyDescriptor('color'),

        /**
         * Gets or sets the boolean {@link Property} specifying the vector's visibility.
         * @memberof DynamicVector.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the vector's width.
         * @memberof DynamicVector.prototype
         * @type {Property}
         */
        width : createDynamicPropertyDescriptor('width'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the the vector's direction.
         * @memberof DynamicVector.prototype
         * @type {Property}
         */
        direction : createDynamicPropertyDescriptor('direction'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the vector's graphical length in meters.
         * @memberof DynamicVector.prototype
         * @type {Property}
         */
        length : createDynamicPropertyDescriptor('length')
    });

    /**
     * Duplicates a DynamicVector instance.
     *
     * @param {DynamicVector} [result] The object onto which to store the result.
     * @returns {DynamicVector} The modified result parameter or a new instance if one was not provided.
     */
    DynamicVector.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicVector();
        }
        result.color = this.color;
        result.width = this.width;
        result.direction = this.direction;
        result.length = this.length;
        result.show = this.show;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicVector} source The object to be merged into this object.
     */
    DynamicVector.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.color = defaultValue(this.color, source.color);
        this.width = defaultValue(this.width, source.width);
        this.direction = defaultValue(this.direction, source.direction);
        this.length = defaultValue(this.length, source.length);
        this.show = defaultValue(this.show, source.show);
    };

    return DynamicVector;
});
