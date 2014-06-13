/*global define*/
define([
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './freezeObject',
        './JulianDate',
        './TimeStandard'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        freezeObject,
        JulianDate,
        TimeStandard) {
    "use strict";

    /**
     * An interval defined by a start date and a stop date.  The end points are optionally included
     * in the interval.  The interval should be treated as immutable.
     *
     * @alias TimeInterval
     * @constructor
     *
     * @param {JulianDate} start The start date of the interval.
     * @param {JulianDate} stop The stop date of the interval.
     * @param {Boolean} [isStartIncluded=true] <code>true</code> if the start date is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [isStopIncluded=true] <code>true</code> if the stop date is included in the interval, <code>false</code> otherwise.
     * @param {Object} [data The data associated with this interval.
     *
     * @exception {DeveloperError} start must be specified.
     * @exception {DeveloperError} stop must be specified.
     *
     * @see TimeInterval.fromIso8601
     * @see TimeIntervalCollection
     * @see JulianDate
     *
     * @example
     * // Construct an Timeinterval closed on one end with a Color payload.
     * var interval = new Cesium.TimeInterval(Cesium.new JulianDate(1000), Cesium.new JulianDate(1001), true, false, Cesium.Color.WHITE);
     */
    var TimeInterval = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.start)) {
            throw new DeveloperError('options.start is required.');
        }
        if (!defined(options.stop)) {
            throw new DeveloperError('options.stop is required.');
        }
        //>>includeEnd('debug');

        var start = options.start;
        var stop = options.stop;
        var isStartIncluded = defaultValue(options.isStartIncluded, true);
        var isStopIncluded = defaultValue(options.isStopIncluded, true);

        var stopComparedToStart = JulianDate.compare(stop, start);

        /**
         * Gets or sets the start time of the interval.
         * @type {JulianDate}
         */
        this.start = start;
        /**
         * Gets or sets the stop time of the interval.
         */
        this.stop = stop;
        /**
         * Gets or sets the data associated with this interval.
         */
        this.data = options.data;
        /**
         * Gets or sets whether or not the start time is included in the interval.
         */
        this.isStartIncluded = isStartIncluded;
        /**
         * Gets or sets whether or not the stop time is included in the interval.
         */
        this.isStopIncluded = isStopIncluded;
    };

    defineProperties(TimeInterval.prototype, {
        isEmpty : {
            get : function() {
                var stopComparedToStart = JulianDate.compare(this.stop, this.start);
                return stopComparedToStart < 0 || (stopComparedToStart === 0 && (!this.isStartIncluded || !this.isStopIncluded));
            }
        }
    });

    var scratchInterval = {
        start : undefined,
        stop : undefined,
        isStartIncluded : undefined,
        isStopIncluded : undefined,
        data : undefined
    };

    /**
     * Creates an immutable TimeInterval from an ISO 8601 interval string.
     *
     * @param {String} iso8601 A valid ISO8601 interval.
     * @param {Boolean} [isStartIncluded=true] <code>true</code> if the start date is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [isStopIncluded=true] <code>true</code> if the stop date is included in the interval, <code>false</code> otherwise.
     * @param {Object} [data] The data associated with this interval.
     * @returns {TimeInterval} The new {@Link TimeInterval} instance or <code>undefined</code> if an invalid ISO8601 string is provided.
     *
     * @see TimeInterval
     * @see TimeIntervalCollection
     * @see JulianDate
     * @see {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601 on Wikipedia}
     *
     * @example
     * // Construct an open Timeinterval with a Cartesian data payload.
     * var interval = Cesium.TimeInterval.fromIso8601('2012-03-15T11:02:24.55Z/2012-03-15T12:28:24.03Z', false, false, new Cesium.Cartesian3(1,2,3));
     */
    TimeInterval.fromIso8601 = function(options, result) {
        var dates = options.iso8601.split('/');
        if (!defined(result)) {
            scratchInterval.start = JulianDate.fromIso8601(dates[0]);
            scratchInterval.stop = JulianDate.fromIso8601(dates[1]);
            scratchInterval.isStartIncluded = defaultValue(options.isStartIncluded, true);
            scratchInterval.isStopIncluded = defaultValue(options.isStopIncluded, true);
            scratchInterval.data = options.data;
            return new TimeInterval(scratchInterval);
        }

        result.start = JulianDate.fromIso8601(dates[0]);
        result.stop = JulianDate.fromIso8601(dates[1]);
        result.isStartIncluded = defaultValue(options.isStartIncluded, true);
        result.isStopIncluded = defaultValue(options.isStopIncluded, true);
        result.data = options.data;
        return result;
    };

    /**
     * Duplicates this instance.
     *
     * @param {TimeInterval} [result] An existing instance to use for the result.
     * @returns {TimeInterval} The modified result parameter or a new instance if none was provided.
     */
    TimeInterval.clone = function(timeInterval, result) {
        if (!defined(result)) {
            return new TimeInterval(timeInterval);
        }
        result.start = timeInterval.start;
        result.stop = timeInterval.stop;
        result.isStartIncluded = timeInterval.isStartIncluded;
        result.isStopIncluded = timeInterval.isStopIncluded;
        result.data = timeInterval.data;
        return result;
    };

    /**
     * Compares two instances and returns <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TimeInterval} [left] The first instance.
     * @param {TimeInterval} [right] The second instance.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
     */
    TimeInterval.equals = function(left, right, dataComparer) {
        return left === right || defined(left) && defined(right) && (left.isEmpty && right.isEmpty || left.isStartIncluded === right.isStartIncluded && left.isStopIncluded === right.isStopIncluded && JulianDate.equals(left.start, right.start) && JulianDate.equals(left.stop, right.stop) && (left.data === right.data || (defined(dataComparer) && dataComparer(left.data, right.data))));
    };

    /**
     * Compares two instances and returns <code>true</code> if they are within <code>epsilon</code> seconds of
     * each other.  That is, in order for the dates to be considered equal (and for
     * this function to return <code>true</code>), the absolute value of the difference between them, in
     * seconds, must be less than <code>epsilon</code>.
     *
     * @param {TimeInterval} [left] The first instance.
     * @param {TimeInterval} [right] The second instance.
     * @param {Number} epsilon The maximum number of seconds that should separate the two instances.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
     */
    TimeInterval.equalsEpsilon = function(left, right, epsilon, dataComparer) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        //>>includeEnd('debug');

        return left === right || defined(left) && defined(right) && (left.isEmpty && right.isEmpty || left.isStartIncluded === right.isStartIncluded && left.isStopIncluded === right.isStopIncluded && JulianDate.equalsEpsilon(left.start, right.start, epsilon) && JulianDate.equalsEpsilon(left.stop, right.stop, epsilon) && (left.data === right.data || (defined(dataComparer) && dataComparer(left.data, right.data))));
    };

    /**
     * Computes an interval which is the intersection of this interval with another while
     * also providing a means to merge the data of the two intervals.
     *
     * @param {TimeInterval} other The interval to intersect with this interval.
     * @param {Function} [mergeCallback] A callback which takes the data property from
     * both intervals as input and merges it into a single new value. If the callback is undefined,
     * this will intersect the two intervals and return the new interval with the data from this
     * interval.
     *
     * @returns {TimeInterval} The new {@Link TimeInterval} that is the intersection of the two intervals,
     * with its data representing the merge of the data in the two existing intervals.
     */
    TimeInterval.intersect = function(left, right, mergeCallback, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(result)) {
            result = TimeInterval.clone(TimeInterval.EMPTY);
            //throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        if (!defined(right)) {
            return TimeInterval.clone(TimeInterval.EMPTY, result);
        }

        var leftStart = left.start;
        var leftStop = left.stop;

        var rightStart = right.start;
        var rightStop = right.stop;

        var intersectsStartRight = JulianDate.greaterThanOrEquals(rightStart, leftStart) && JulianDate.greaterThanOrEquals(leftStop, rightStart);
        var intersectsStartLeft = !intersectsStartRight && JulianDate.lessThanOrEquals(rightStart, leftStart) && JulianDate.lessThanOrEquals(leftStart, rightStop);

        if (!intersectsStartRight && !intersectsStartLeft) {
            return TimeInterval.clone(TimeInterval.EMPTY);
        }

        var leftIsStartIncluded = left.isStartIncluded;
        var leftIsStopIncluded = left.isStopIncluded;
        var rightIsStartIncluded = right.isStartIncluded;
        var rightIsStopIncluded = right.isStopIncluded;
        var leftLessThanRight = JulianDate.lessThan(leftStop, rightStop);

        result.start = intersectsStartRight ? rightStart : leftStart;
        result.isStartIncluded = (leftIsStartIncluded && rightIsStartIncluded) || (!JulianDate.equals(rightStart, leftStart) && ((intersectsStartRight && rightIsStartIncluded) || (intersectsStartLeft && leftIsStartIncluded)));
        result.stop = leftLessThanRight ? leftStop : rightStop;
        result.isStopIncluded = leftLessThanRight ? leftIsStopIncluded : (leftIsStopIncluded && rightIsStopIncluded) || (!JulianDate.equals(rightStop, leftStop) && rightIsStopIncluded);
        result.data = defined(mergeCallback) ? mergeCallback(left.data, right.data) : left.data;
        return result;
    };

    /**
     * Returns <code>true</code> if this interval contains the specified date.
     *
     * @param {JulianDate} julianDate The date to check for.
     * @returns {Boolean} <code>true</code> if the TimeInterval contains the specified date, <code>false</code> otherwise.
     */
    TimeInterval.contains = function(timeInterval, julianDate) {
        if (timeInterval.isEmpty) {
            return false;
        }

        var startComparedToDate = JulianDate.compare(timeInterval.start, julianDate);
        if (startComparedToDate === 0) {
            return timeInterval.isStartIncluded;
        }

        var dateComparedToStop = JulianDate.compare(julianDate, timeInterval.stop);
        if (dateComparedToStop === 0) {
            return timeInterval.isStopIncluded;
        }

        return startComparedToDate < 0 && dateComparedToStop < 0;
    };

    /**
     * Creates a copy of this TimeInterval.
     *
     * @returns A new TimeInterval that is equal to this interval.
     */
    TimeInterval.prototype.clone = function(result) {
        return TimeInterval.clone(this, result);
    };

    /**
     * Compares this TimeInterval against the provided TimeInterval componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TimeInterval} [right] The right hand side Cartesian.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If ommitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    TimeInterval.prototype.equals = function(right, dataComparer) {
        return TimeInterval.equals(this, right, dataComparer);
    };

    /**
     * Compares this TimeInterval against the provided TimeInterval componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {TimeInterval} [right] The right hand side Cartesian.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If ommitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    TimeInterval.prototype.equalsEpsilon = function(right, epsilon, dataComparer) {
        return TimeInterval.equalsEpsilon(this, right, epsilon, dataComparer);
    };

    /**
     * An empty interval.
     *
     * @type {TimeInterval}
     * @constant
     */
    TimeInterval.EMPTY = freezeObject(new TimeInterval({
        start : new JulianDate(),
        stop : new JulianDate(),
        isStartIncluded : false,
        isStopIncluded : false
    }));

    return TimeInterval;
});