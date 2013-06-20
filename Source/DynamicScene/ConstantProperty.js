/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a single value which does not change with regard to simulation time.
     *
     * @alias ConstantProperty
     * @constructor
     *
     * @see DynamicProperty
     */
    var ConstantProperty = function(value) {
        this._value = value;
    };

    /**
     * Returns the value of the property.
     * @memberof ConstantProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.  This value is not used.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantProperty.prototype.getValue = function(time, result) {
        var value = this._value;
        if (typeof value !== 'undefined' && typeof value.clone === 'function') {
            return value.clone(result);
        }
        return value;
    };

    return ConstantProperty;
});