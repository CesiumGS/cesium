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
        this._clonable = typeof value !== 'undefined' && typeof value.clone === 'function';
    };

    /**
     * Gets the value of the property, optionally cloning it.
     * @memberof ConstantProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.  This parameter is unused.
     * @param {Object} [result] The object to store the value into if the value is clonable.  If the result is omitted or the value does not implement clone, the actual value is returned.
     * @returns The modified result parameter or the actual value instance if the value is not clonable.
     */
    ConstantProperty.prototype.getValue = function(time, result) {
        var value = this._value;
        if (this._clonable) {
            return value.clone(result);
        }
        return value;
    };

    return ConstantProperty;
});