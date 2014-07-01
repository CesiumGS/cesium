/*global define*/
define([
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/isArray'
    ], function(
        defineProperties,
        DeveloperError,
        Event,
        isArray) {
    "use strict";

    /**
     * A {@link Property} whose value does not change with respect to simulation time.
     * If the value is a non-basic type, then it must provide clone and equals functions.
     *
     * @alias ConstantProperty
     * @constructor
     *
     * @param {Object} [value] The property value.
     *
     * @see ConstantPositionProperty
     *
     * @exception {DeveloperError} value.clone is a required function.
     * @exception {DeveloperError} value.equals is a required function.
     */
    var ConstantProperty = function(value) {
        this._value = undefined;
        this._simple = true;
        this._definitionChanged = new Event();
        this.setValue(value);
    };

    defineProperties(ConstantProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * This property always returns <code>true</code>.
         * @memberof ConstantProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            value : true
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value.
         * @memberof ConstantProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        }
    });

    /**
     * Gets the value of the property.
     *
     * @param {JulianDate} [time] The time for which to retrieve the value.  This parameter is unused since the value does not change with respect to time.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantProperty.prototype.getValue = function(time, result) {
        return this._simple ? this._value : this._value.clone(result);
    };

    /**
     * Sets the value of the property.
     * If the value is a non-basic type, then it must provide clone and equals functions.
     *
     * @param {Object} value The property value.
     *
     * @exception {DeveloperError} value.clone is a required function.
     * @exception {DeveloperError} value.equals is a required function.
     */
    ConstantProperty.prototype.setValue = function(value) {
        var oldValue = this._value;
        var simple = this._simple;
        if ((simple && oldValue !== value) || (!simple && !oldValue.equals(value))) {
            simple = typeof value !== 'object' || isArray(value);

            //>>includeStart('debug', pragmas.debug);
            if (!simple) {
                if (typeof value.clone !== 'function') {
                    throw new DeveloperError('clone is a required function.');
                }
                if (typeof value.equals !== 'function') {
                    throw new DeveloperError('equals is a required function.');
                }
            }
            //>>includeEnd('debug');

            this._value = simple ? value : value.clone();
            this._simple = simple;
            this._definitionChanged.raiseEvent(this);
        }
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ConstantProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof ConstantProperty && //
                ((this._simple && (this._value === other._value)) || //
                (!this._simple && this._value.equals(other._value))));
    };

    return ConstantProperty;
});
