/*global define*/
define(['../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/TimeIntervalCollection'
        ], function(
                defineProperties,
                DeveloperError,
                TimeIntervalCollection) {
    "use strict";

    /**
     * A {@link Property} which is defined by a TimeIntervalCollection, where the
     * data property of the interval is another Property instance which is evaluated
     * at the provided time.
     *
     * @alias CompositeProperty
     * @constructor
     */
    var CompositeProperty = function() {
        this._intervals = new TimeIntervalCollection();
    };

    /**
     * @memberof ConstantProperty
     * @returns {Boolean} Always returns true, since this property always varies with simulation time.
     */
    CompositeProperty.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Returns the value of the property at the specified simulation time.
     * @memberof Property
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    CompositeProperty.prototype.getValue = function(time, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required');
        }

        var interval = this._intervals.findIntervalContainingDate(time);
        if (typeof interval !== 'undefined') {
            var data = interval.data;
            if (typeof data !== 'undefined') {
                return data.getValue(time, result);
            }
        }
        return undefined;
    };

    /**
     * Gets the interval collection.
     * @memberof CompositeProperty.prototype
     *
     * @type {TimeIntervalCollection}
     */
    CompositeProperty.prototype.getIntervals = function() {
        return this._intervals;
    };

    return CompositeProperty;
});