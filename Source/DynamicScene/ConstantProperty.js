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

    function prototypeClone(value, result) {
        return value.clone(result);
    }

    function noClone(value, result) {
        return value;
    }

    /**
     * A {@link Property} whose value never changes.
     *
     * @alias ConstantProperty
     * @constructor
     *
     * @param {Object|Number|String} value The property value.
     * @param {Function} [clone=value.clone] A function which takes the value and a result parameter and clones it.
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
     *
     * @example
     * //Create a ConstantPropety from a user-defined object.
     * var myObject = {
     *     value : 6
     * };
     * function cloneMyObject(value, result) {
     *     return {
     *         value : value.value
     *     };
     * }
     * var constantProperty = new ConstantProperty(myObject, cloneMyObject);
     */
    var ConstantProperty = function(value, clone) {
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }

        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Enumeration)) {
            if (typeof value.clone !== 'function' && typeof clone !== 'function') {
                throw new DeveloperError('clone is a required function.');
            }

            clone = defaultValue(clone, prototypeClone);
        }

        this._value = value;
        this._clone = defaultValue(clone, noClone);
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
        return this._clone(this._value, result);
    };

    return ConstantProperty;
});
