/*global define*/
define(['../Core/DeveloperError'
        ], function(
                DeveloperError) {
    "use strict";

    function throwInstantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * The base class for all properties, which represent a value that can
     * optionally vary over time.
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias Property
     * @constructor
     *
     * @see CompositeProperty
     * @see ConstantProperty
     * @see SampledProperty
     * @see TimeIntervalCollectionProperty
     * @see MaterialProperty
     * @see PositionProperty
     * @see RefereenceProperty
     */
    var Property = throwInstantiationError;

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
    Property.prototype.getValue = throwInstantiationError;

    return Property;
});