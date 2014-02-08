/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Enumeration',
        '../Core/TimeIntervalCollection',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Enumeration,
        TimeIntervalCollection,
        Property) {
    "use strict";

    /**
     * A {@link Property} which is defined by a TimeIntervalCollection, where the
     * data property of each {@link TimeInterval} represents the value at time.
     *
     * @alias TimeIntervalCollectionProperty
     * @constructor
     *
     * @param {Function} [clone=value.clone] A function which takes the value and a result parameter and clones it.
     * This parameter is only required if the value is not a number or string and does not have a clone function.
     *
     * @example
     * //Create a Cartesian2 interval property which contains data on August 1st, 2012
     * //and uses a different value every 6 hours.
     * var composite = new Cesium.TimeIntervalCollectionProperty();
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T00:00:00.00Z/2012-08-01T06:00:00.00Z', true, false, new Cesium.Cartesian2(2.0, 3.4)));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T06:00:00.00Z/2012-08-01T12:00:00.00Z', true, false, new Cesium.Cartesian2(12.0, 2.7)));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T12:00:00.00Z/2012-08-01T18:00:00.00Z', true, false, new Cesium.Cartesian2(5.0, 12.4)));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T18:00:00.00Z/2012-08-02T00:00:00.00Z', true, true, new Cesium.Cartesian2(85.0, 4.1)));
     *
     * @example
     * //Create a TimeIntervalCollectionProperty that contains user-defined objects.
     * var myObject = {
     *     value : 6
     * };
     * var myObject2 = {
     *     value : 12
     * };
     * function cloneMyObject(value, result) {
     *     return {
     *         value : value.value
     *     };
     * }
     * var composite = new Cesium.TimeIntervalCollectionProperty(cloneMyObject);
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T00:00:00.00Z/2012-08-01T06:00:00.00Z', true, false, myObject));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T06:00:00.00Z/2012-08-01T12:00:00.00Z', true, false, myObject2));
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
        intervals : {
            get : function() {
                return this._intervals;
            }
        }
    });

    /**
     * Gets the value of the property at the provided time.
     * @memberof TimeIntervalCollectionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} This value requires a clone function be specified for the TimeIntervalCollectionProperty constructor.
     */
    TimeIntervalCollectionProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var value = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(value) && (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Enumeration))) {
            return value.clone(result);
        }
        return value;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof TimeIntervalCollectionProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    TimeIntervalCollectionProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof TimeIntervalCollectionProperty && //
               this._intervals.equals(other._intervals, Property.equals));
    };

    return TimeIntervalCollectionProperty;
});