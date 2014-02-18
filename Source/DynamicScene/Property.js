/*global define*/
define(['../Core/defined',
        '../Core/DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    /**
     * The interface for all properties, which represent a value that can
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
     * @see ReferenceProperty
     */
    var Property = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof Property
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    Property.prototype.getValue = DeveloperError.throwInstantiationError;

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Property
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Property.prototype.equals = DeveloperError.throwInstantiationError;

    /**
     * @private
     */
    Property.equals = function(left, right) {
        return left === right || (defined(left) && left.equals(right));
    };

    return Property;
});