/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Cartesian2,
        Color,
        defaultValue,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultEvenColor = Color.WHITE;
    var defaultOddColor = Color.BLACK;
    var defaultRepeat = new Cartesian2(2.0, 2.0);

    /**
     * A {@link MaterialProperty} that maps to checkerboard {@link Material} uniforms.
     *
     * @alias CheckerboardMaterialProperty
     * @constructor
     */
    var CheckerboardMaterialProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._definitionChanged = new Event();

        this._evenColor = undefined;
        this._evenColorSubscription = undefined;

        this._oddColor = undefined;
        this._oddColorSubscription = undefined;

        this._repeat = undefined;
        this._repeatSubscription = undefined;

        this.evenColor = options.evenColor;
        this.oddColor = options.oddColor;
        this.repeat = options.repeat;
    };

    defineProperties(CheckerboardMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof CheckerboardMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._evenColor) && //
                       Property.isConstant(this._oddColor) && //
                       Property.isConstant(this._repeat);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof CheckerboardMaterialProperty.prototype
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
         * Gets or sets the {@link Color} property which determines the first color.
         * @memberof CheckerboardMaterialProperty.prototype
         * @type {Property}
         */
        evenColor : createPropertyDescriptor('evenColor'),
        /**
         * Gets or sets the {@link Color} property which determines the second color.
         * @memberof CheckerboardMaterialProperty.prototype
         * @type {Property}
         */
        oddColor : createPropertyDescriptor('oddColor'),
        /**
         * A {@link Cartesian2} property which determines how many times the checkerboard tiles repeat in each direction.
         * @memberof CheckerboardMaterialProperty.prototype
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
    CheckerboardMaterialProperty.prototype.getType = function(time) {
        return 'Checkerboard';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    CheckerboardMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.lightColor = Property.getValueOrClonedDefault(this._evenColor, time, defaultEvenColor, result.lightColor);
        result.darkColor = Property.getValueOrClonedDefault(this._oddColor, time, defaultOddColor, result.darkColor);
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
    CheckerboardMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof CheckerboardMaterialProperty && //
                       Property.equals(this._evenColor, other._evenColor) && //
                       Property.equals(this._oddColor, other._oddColor) && //
                       Property.equals(this._repeat, other._repeat));
    };

    return CheckerboardMaterialProperty;
});
