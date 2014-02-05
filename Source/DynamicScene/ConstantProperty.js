/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Enumeration'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Enumeration) {
    "use strict";

    /**
     * A {@link Property} whose value never changes.
     *
     * @alias ConstantProperty
     * @constructor
     *
     * @param {Object|Number|String} value The property value.
     * This parameter is only required if the value is not a number or string and does not have a clone function.
     *
     * @exception {DeveloperError} value is required.
     * @exception {DeveloperError} clone is a required function.
     *
     * @see ConstantPositionProperty
     *
     * @example
     * //Create a constant value from a Cartesian2 instance.
     * var constantProperty = new ConstantProperty(new Cartesian2(10, 12));
     */
    var ConstantProperty = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var simple = typeof value !== 'object' || Array.isArray(value) || value instanceof Enumeration;

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

        this._value = value;
        this._simple = simple;
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof CompositeProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.  This parameter is unused since the value never changes.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantProperty.prototype.getValue = function(time, result) {
        if (this._simple) {
            return this._value;
        }
        return this._value.clone(result);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ConstantProperty
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
