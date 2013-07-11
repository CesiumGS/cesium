/*global define*/
define(function() {
    "use strict";

    /**
     * A {@link Property} which does not change with regard to simulation time.
     *
     * @alias ConstantProperty
     * @constructor
     */
    var ConstantProperty = function(value) {
        this._value = undefined;
        this._clonable = false;
        this.setValue(value);
    };

    /**
     * @memberof ConstantProperty
     * @returns {Boolean} Always returns false, since this property never varies with simulation time.
     */
    ConstantProperty.prototype.getIsTimeVarying = function() {
        return false;
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

    ConstantProperty.prototype.setValue = function(value) {
        this._value = value;
        this._clonable = typeof value !== 'undefined' && typeof value.clone === 'function';
    };

    ConstantProperty.prototype.sampleValue = function(start, stop, maximumStep, requiredTimes, resultTimes, resultValues) {
        resultTimes[0] = start.clone();
        resultTimes[1] = stop.clone();
        resultTimes.length = 2;
        resultValues[0] = this.getValue(start, resultValues[0]);
        resultValues[1] = this.getValue(stop, resultValues[1]);
        resultValues.length = 2;
    };

    return ConstantProperty;
});