/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property',
        './StripeOrientation'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property,
        StripeOrientation) {
    "use strict";

    var defaultOrientation = StripeOrientation.HORIZONTAL;
    var defaultEvenColor = Color.WHITE;
    var defaultOddColor = Color.BLACK;
    var defaultOffset = 0;
    var defaultRepeat = 1;

    /**
     * A {@link MaterialProperty} that maps to stripe {@link Material} uniforms.
     *
     * @alias StripeMaterialProperty
     * @constructor
     */
    var StripeMaterialProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._definitionChanged = new Event();

        this._orientation = undefined;
        this._orientationSubscription = undefined;

        this._evenColor = undefined;
        this._evenColorSubscription = undefined;

        this._oddColor = undefined;
        this._oddColorSubscription = undefined;

        this._offset = undefined;
        this._offsetSubscription = undefined;

        this._repeat = undefined;
        this._repeatSubscription = undefined;

        this.orientation = options.orientation;
        this.evenColor = options.evenColor;
        this.oddColor = options.oddColor;
        this.offset = options.offset;
        this.repeat = options.repeat;
    };

    defineProperties(StripeMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof StripeMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._orientation) && //
                       Property.isConstant(this._evenColor) && //
                       Property.isConstant(this._oddColor) && //
                       Property.isConstant(this._offset) && //
                       Property.isConstant(this._repeat);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof StripeMaterialProperty.prototype
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
         * Gets or sets the {@link StripeOrientation} property which determines if the stripes are horizontal or vertical.
         * @memberof StripeMaterialProperty.prototype
         * @type {Property}
         */
        orientation : createPropertyDescriptor('orientation'),
        /**
         * Gets or sets the {@link Color} property which determines the first color.
         * @memberof StripeMaterialProperty.prototype
         * @type {Property}
         */
        evenColor : createPropertyDescriptor('evenColor'),
        /**
         * Gets or sets the {@link Color} property which determines the second color.
         * @memberof StripeMaterialProperty.prototype
         * @type {Property}
         */
        oddColor : createPropertyDescriptor('oddColor'),
        /**
         * Gets or sets the numeric property which determines at which point into the pattern
         * to begin drawing; with 0.0 being the beginning of the even color, 1.0 the beginning
         * of the odd color, 2.0 being the even color again, and any multiple or fractional values
         * being in between.
         * @memberof StripeMaterialProperty.prototype
         * @type {Property}
         */
        offset : createPropertyDescriptor('offset'),
        /**
         * A numeric property which determines how many times the stripe pattern repeats.
         * @memberof StripeMaterialProperty.prototype
         * @type {Property}
         */
        repeat : createPropertyDescriptor('repeat')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    StripeMaterialProperty.prototype.getType = function(time) {
        return 'Stripe';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    StripeMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.horizontal = Property.getValueOrDefault(this._orientation, time, defaultOrientation) === StripeOrientation.HORIZONTAL;
        result.evenColor = Property.getValueOrClonedDefault(this._evenColor, time, defaultEvenColor, result.evenColor);
        result.oddColor = Property.getValueOrClonedDefault(this._oddColor, time, defaultOddColor, result.oddColor);
        result.offset = Property.getValueOrDefault(this._offset, time, defaultOffset);
        result.repeat = Property.getValueOrDefault(this._repeat, time, defaultRepeat);
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    StripeMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof StripeMaterialProperty && //
                       Property.equals(this._orientation, other._orientation) && //
                       Property.equals(this._evenColor, other._evenColor) && //
                       Property.equals(this._oddColor, other._oddColor) && //
                       Property.equals(this._offset, other._offset) && //
                       Property.equals(this._repeat, other._repeat));
    };

    return StripeMaterialProperty;
});
