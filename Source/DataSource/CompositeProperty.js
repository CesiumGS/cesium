/*global define*/
define(['./Property',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/EventHelper',
        '../Core/TimeIntervalCollection',
        '../Core/wrapFunction'
    ], function(
        Property,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        EventHelper,
        TimeIntervalCollection,
        wrapFunction) {
    "use strict";

    function subscribeAll(property, eventHelper, definitionChanged, intervals) {
        var callback = function() {
            definitionChanged.raiseEvent(property);
        };

        var items = [];
        eventHelper.removeAll();
        var length = intervals.getLength();
        for (var i = 0; i < length; i++) {
            var interval = intervals.get(i);
            if (defined(interval.data) && items.indexOf(interval.data) === -1) {
                eventHelper.add(interval.data.definitionChanged, callback);
            }
        }
    }

    /**
     * A {@link Property} which is defined by a {@link TimeIntervalCollection}, where the
     * data property of each {@link TimeInterval} is another Property instance which is
     * evaluated at the provided time.
     *
     * @alias CompositeProperty
     * @constructor
     *
     * @see CompositeMaterialProperty
     * @see CompositePositionProperty
     *
     * @example
     * var constantProperty = ...;
     * var sampledProperty = ...;
     *
     * //Create a composite property from two previously defined properties
     * //where the property is valid on August 1st, 2012 and uses a constant
     * //property for the first half of the day and a sampled property for the
     * //remaining half.
     * var composite = new Cesium.CompositeProperty();
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T00:00:00.00Z/2012-08-01T12:00:00.00Z', true, true, constantProperty));
     * composite.intervals.addInterval(Cesium.TimeInterval.fromIso8601('2012-08-01T12:00:00.00Z/2012-08-02T00:00:00.00Z', false, false, sampledProperty));
     */
    var CompositeProperty = function() {
        var intervals = new TimeIntervalCollection();
        var definitionChanged = new Event();

        //For now, we patch our instance of TimeIntervalCollection to raise our definitionChanged event.
        //We might want to consider adding events to TimeIntervalCollection itself for us to listen to,
        var that = this;
        var eventHelper = new EventHelper();
        var intervalsChanged = function() {
            subscribeAll(that, eventHelper, definitionChanged, intervals);
            definitionChanged.raiseEvent(that);
        };
        intervals.addInterval = wrapFunction(intervals, intervalsChanged, intervals.addInterval);
        intervals.removeInterval = wrapFunction(intervals, intervalsChanged, intervals.removeInterval);
        intervals.clear = wrapFunction(intervals, intervalsChanged, intervals.clear);

        this._intervals = intervals;
        this._definitionChanged = definitionChanged;
    };

    defineProperties(CompositeProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof CompositeProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return this._intervals.isEmpty();
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value.
         * @memberof CompositeProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets the interval collection.
         * @memberof CompositeProperty.prototype
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
     * @memberof CompositeProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    CompositeProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var innerProperty = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty.getValue(time, result);
        }
        return undefined;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof CompositeProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    CompositeProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof CompositeProperty && //
                this._intervals.equals(other._intervals, Property.equals));
    };

    return CompositeProperty;
});