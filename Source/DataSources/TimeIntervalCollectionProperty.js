/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/isArray',
        '../Core/TimeIntervalCollection',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        isArray,
        TimeIntervalCollection,
        Property) {
    "use strict";

    /**
     * A {@link Property} which is defined by a {@link TimeIntervalCollection}, where the
     * data property of each {@link TimeInterval} represents the value at time.
     *
     * @alias TimeIntervalCollectionProperty
     * @constructor
     *
     * @example
     * //Create a Cartesian2 interval property which contains data on August 1st, 2012
     * //and uses a different value every 6 hours.
     * var composite = new Cesium.TimeIntervalCollectionProperty();
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
     *     iso8601 : '2012-08-01T00:00:00.00Z/2012-08-01T06:00:00.00Z',
     *     isStartIncluded : true,
     *     isStopIncluded : false,
     *     data : new Cesium.Cartesian2(2.0, 3.4)
     * }));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
     *     iso8601 : '2012-08-01T06:00:00.00Z/2012-08-01T12:00:00.00Z',
     *     isStartIncluded : true,
     *     isStopIncluded : false,
     *     data : new Cesium.Cartesian2(12.0, 2.7)
     * }));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
     *     iso8601 : '2012-08-01T12:00:00.00Z/2012-08-01T18:00:00.00Z',
     *     isStartIncluded : true,
     *     isStopIncluded : false,
     *     data : new Cesium.Cartesian2(5.0, 12.4)
     * }));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
     *     iso8601 : '2012-08-01T18:00:00.00Z/2012-08-02T00:00:00.00Z',
     *     isStartIncluded : true,
     *     isStopIncluded : true,
     *     data : new Cesium.Cartesian2(85.0, 4.1)
     * }));
     */
    var TimeIntervalCollectionProperty = function() {
        this._definitionChanged = new Event();
        this._intervals = new TimeIntervalCollection();
        this._intervals.changedEvent.addEventListener(TimeIntervalCollectionProperty.prototype._intervalsChanged, this);
    };

    defineProperties(TimeIntervalCollectionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof TimeIntervalCollectionProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return this._intervals.isEmpty;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value.
         * @memberof TimeIntervalCollectionProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
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
        if (defined(value) && (typeof value === 'object' && !isArray(value))) {
            return value.clone(result);
        }
        return value;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    TimeIntervalCollectionProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof TimeIntervalCollectionProperty && //
               this._intervals.equals(other._intervals, Property.equals));
    };

    /**
     * @private
     */
    TimeIntervalCollectionProperty.prototype._intervalsChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return TimeIntervalCollectionProperty;
});
