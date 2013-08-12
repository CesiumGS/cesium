/*global define*/
define(['../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Enumeration',
        '../Core/TimeIntervalCollection'
        ], function(
                defineProperties,
                DeveloperError,
                Enumeration,
                TimeIntervalCollection) {
    "use strict";

    /**
     * A {@link Property} which is defined by an TimeIntervalCollection, where the
     * data property of the interval represents the value at simulation time.
     *
     * @alias TimeIntervalCollectionProperty
     * @constructor
     *
     * @param {Function} [clone=value.clone] A function which takes the value and result parameter and clones it.
     * This parameter is only required if the value is not a number or string and does not have a clone function.
     *
     */
    var TimeIntervalCollectionProperty = function(clone) {
        this._intervals = new TimeIntervalCollection();
        this._clone = clone;
    };

    /**
     * @memberof TimeIntervalCollectionProperty
     * @returns {Boolean} Always returns true, since this property always varies with simulation time.
     */
    TimeIntervalCollectionProperty.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Returns the value of the property at the specified simulation time.
     * @memberof TimeIntervalCollectionProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    TimeIntervalCollectionProperty.prototype.getValue = function(time, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required');
        }

        var interval = this._intervals.findIntervalContainingDate(time);
        if (typeof interval !== 'undefined') {
            var value = interval.data;
            if (typeof value !== 'undefined' && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && !(value instanceof Enumeration) && !Array.isArray(value)) {
                if (typeof value.clone === 'function') {
                    return value.clone(result);
                }
                return this._clone(value, result);
            }
            return value;
        }
        return undefined;
    };

    /**
     * Gets the interval collection.
     * @memberof TimeIntervalCollectionProperty
     *
     * @type {TimeIntervalCollection}
     */
    TimeIntervalCollectionProperty.prototype.getIntervals = function() {
        return this._intervals;
    };

    return TimeIntervalCollectionProperty;
});