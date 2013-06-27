/*global define*/
define(['../Core/DeveloperError'
        ], function(
                DeveloperError) {
    "use strict";

    function throwInstantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * The base class for all properties, which represent a single value that can optionally
     * vary over simulation time.  This type cannot be instantiated directly.
     *
     * @alias Property
     * @constructor
     *
     * @see ConstantProperty
     * @see DynamicProperty
     * @see PositionProperty
     */
    var Property = throwInstantiationError();

    /**
     * @memberof Property
     * @returns {Boolean} True if the property varies with simulation time, false otherwise.
     */
    Property.prototype.getIsTimeVarying = throwInstantiationError();

    /**
     * Returns the value of the property at the specified simulation time.
     * @memberof Property
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    Property.prototype.getValue = throwInstantiationError();

    /**
     * Samples the value of the property over time using the specified options.
     * @memberof Property
     *
     * @param {JulianDate} start The time of the first sample.  If there is no data at this time, the next earliest time is used.
     * @param {JulianDate} stop The time of the last sample.  If there is no data at this time, the latest previous time is used.
     * @param {Number} [maximumStep] The suggested maximum step size to take between samples, specific implementations can ignore this value if it can produce an equivalent and optimal set of values.
     * @param {Array} [requiredTimes] An array of JulianDate instances, sorted by time, earliest first, that must be sampled in addition to any other steps taken by the sampling function.
     * @param {Object} [resultTimes] An array containing all of the sampled times which corresponds to the result at the same index in resultValues.
     * @param {Object} [resultValues] An array containing all of the samples values, which correspond to the times
     */
    Property.prototype.sampleValue = throwInstantiationError();

    return Property;
});