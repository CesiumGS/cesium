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
     * A {@link Property} which is defined by an TimeIntervalCollection, where the
     * data property of the interval represents the value at simulation time.
     *
     * @alias TimeIntervalCollectionProperty
     * @constructor
     */
    var TimeIntervalCollectionProperty = function() {
        this._intervals = new TimeIntervalCollection();
    };

    defineProperties(TimeIntervalCollectionProperty.prototype, {
        /**
         * Gets the interval collection.
         * @memberof TimeIntervalCollectionProperty.prototype
         *
         * @type {TimeIntervalCollection}
         */
        interval : {
            get : function() {
                return this._intervals;
            }
        }
    });

    /**
     * Returns a value indicating if this property varies with simulation time.
     * @memberof Property
     *
     * @returns {Boolean} True if the property varies with simulation time, false otherwise.
     */
    TimeIntervalCollectionProperty.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Returns the value of the property at the specified simulation time.
     * @memberof Property
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    TimeIntervalCollectionProperty.prototype.getValue = function(time, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required');
        }

        var data;
        var interval = this._intervals.findIntervalContainingDate(time);
        if (typeof interval !== 'undefined') {
            data = interval.data;
            if (typeof data !== 'undefined' && typeof data.clone === 'function') {
                return data.clone(result);
            }
        }
        return data;
    };

    /**
     * Returns the value of the property.
     * @memberof Property
     *
     * @param {JulianDate} start The time of the first sample.  If there is no data at this time, the next earliest time is used.
     * @param {JulianDate} stop The time of the last sample.  If there is no data at this time, the latest available previous time is used.
     * @param {Number} [maximumStep] The recommended maximum step size to take between samples, the specific implementation can ignore this value if it can produce an equivalent optimal set of values.
     * @param {Array} [requiredTimes] An array of JulianDate instances, sorted by time, earliest first, that must be sampled in addition to any other steps taken by the sampling function.
     * @param {Object} [resultTimes] An array containing all of the sampled times which corresponds to the result at the same index in resultValues.
     * @param {Object} [resultValues] An array containing all of the samples values, which correspond to the times
     */
    TimeIntervalCollectionProperty.prototype.sampleValue = function() {
    };

    return TimeIntervalCollectionProperty;
});