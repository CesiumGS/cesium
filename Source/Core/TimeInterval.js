/*global define*/
define([
        './defined',
        './DeveloperError',
        './freezeObject',
        './JulianDate',
        './TimeStandard'
    ], function(
        defined,
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
    var TimeInterval = function(start, stop, isStartIncluded, isStopIncluded, data) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(start)) {
            throw new DeveloperError('start must be specified.');
        }
        if (!defined(stop)) {
            throw new DeveloperError('stop must be specified.');
        }
        //>>includeEnd('debug');

        if (!defined(isStartIncluded)) {
            isStartIncluded = true;
        }

        if (!defined(isStopIncluded)) {
            isStopIncluded = true;
        }

        var stopComparedToStart = JulianDate.compare(stop, start);

        /**
         * The start time of the interval.
         */
        this.start = start;
        /**
         * The stop time of the interval.
         */
        this.stop = stop;
        /**
         * The data associated with this interval.
         */
        this.data = data;
        /**
         * Indicates if <code>start</code> is included in the interval or not.
         */
        this.isStartIncluded = isStartIncluded;
        /**
         * Indicates if <code>stop</code> is included in the interval or not.
         */
        this.isStopIncluded = isStopIncluded;
        /**
         * Indicates if the interval is empty.
         */
        this.isEmpty = stopComparedToStart < 0 || (stopComparedToStart === 0 && (!isStartIncluded || !isStopIncluded));
    };

    /**
     * Creates an immutable TimeInterval from an ISO 8601 interval string.
     *
     * @param {String} iso8601String A valid ISO8601 interval.
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
    TimeInterval.fromIso8601 = function(iso8601String, isStartIncluded, isStopIncluded, data) {
        var iso8601Interval = iso8601String.split('/');
        var intervalStart = JulianDate.fromIso8601(iso8601Interval[0]);
        var intervalStop = JulianDate.fromIso8601(iso8601Interval[1]);
        return new TimeInterval(intervalStart, intervalStop, isStartIncluded, isStopIncluded, data);
    };

    /**
     * Compares the provided TimeIntervals and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TimeInterval} [left] The first interval.
     * @param {TimeInterval} [right] The second interval.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    TimeInterval.equals = function(left, right, dataComparer) {
        return left === right ||
               defined(left) &&
               defined(right) &&
               (left.isEmpty && right.isEmpty ||
                left.isStartIncluded === right.isStartIncluded &&
                left.isStopIncluded === right.isStopIncluded &&
                JulianDate.equals(left.start, right.start) &&
                JulianDate.equals(left.stop, right.stop) &&
                (left.data === right.data ||
                 (defined(dataComparer) && dataComparer(left.data, right.data))));
    };

    /**
     * Compares the provided TimeIntervals componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {TimeInterval} [left] The first TimeInterval.
     * @param {TimeInterval} [right] The second TimeInterval.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If ommitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    TimeInterval.equalsEpsilon = function(left, right, epsilon, dataComparer) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        //>>includeEnd('debug');

        return left === right ||
               defined(left) &&
               defined(right) &&
               (left.isEmpty && right.isEmpty ||
                left.isStartIncluded === right.isStartIncluded &&
                left.isStopIncluded === right.isStopIncluded &&
                JulianDate.equalsEpsilon(left.start, right.start, epsilon) &&
                JulianDate.equalsEpsilon(left.stop, right.stop, epsilon) &&
                (left.data === right.data ||
                 (defined(dataComparer) && dataComparer(left.data, right.data))));
    };

    /**
     * Creates a copy of this TimeInterval.
     *
     * @returns A new TimeInterval that is equal to this interval.
     */
    TimeInterval.prototype.clone = function() {
        return new TimeInterval(this.start, this.stop, this.isStartIncluded, this.isStopIncluded, this.data);
    };

    /**
     * An empty interval.
     *
     * @type {TimeInterval}
     * @constant
     */
    TimeInterval.EMPTY = freezeObject(new TimeInterval(new JulianDate(0, 0, TimeStandard.TAI), new JulianDate(0, 0, TimeStandard.TAI), false, false));

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
    TimeInterval.prototype.intersect = function(other, mergeCallback) {
        if (!defined(other)) {
            return TimeInterval.EMPTY;
        }

        var otherStart = other.start;
        var otherStop = other.stop;
        var otherIsStartIncluded = other.isStartIncluded;
        var otherIsStopIncluded = other.isStopIncluded;

        var thisStart = this.start;
        var thisStop = this.stop;
        var thisIsStartIncluded = this.isStartIncluded;
        var thisIsStopIncluded = this.isStopIncluded;

        var outputData;
        var isStartIncluded;
        var isStopIncluded;

        if (JulianDate.greaterThanOrEquals(otherStart, thisStart) && JulianDate.greaterThanOrEquals(thisStop, otherStart)) {

            isStartIncluded = (!JulianDate.equals(otherStart, thisStart) && otherIsStartIncluded) || (thisIsStartIncluded && otherIsStartIncluded);

            isStopIncluded = thisIsStopIncluded && otherIsStopIncluded;

            outputData = defined(mergeCallback) ? mergeCallback(this.data, other.data) : this.data;

            if (JulianDate.greaterThanOrEquals(thisStop, otherStop)) {
                isStopIncluded = isStopIncluded || (!JulianDate.equals(otherStop, thisStop) && otherIsStopIncluded);
                return new TimeInterval(otherStart, otherStop, isStartIncluded, isStopIncluded, outputData);
            }

            isStopIncluded = isStopIncluded || thisIsStopIncluded;
            return new TimeInterval(otherStart, thisStop, isStartIncluded, isStopIncluded, outputData);
        }

        if (JulianDate.lessThanOrEquals(otherStart, thisStart) && JulianDate.lessThanOrEquals(thisStart, otherStop)) {

            isStartIncluded = (JulianDate.equals(otherStart, thisStart) === false && thisIsStartIncluded) || (thisIsStartIncluded && otherIsStartIncluded);

            isStopIncluded = thisIsStopIncluded && otherIsStopIncluded;

            outputData = defined(mergeCallback) ? mergeCallback(this.data, other.data) : this.data;
            if (JulianDate.greaterThanOrEquals(thisStop, otherStop)) {
                isStopIncluded = isStopIncluded || (JulianDate.equals(otherStop, thisStop) === false && otherIsStopIncluded);
                return new TimeInterval(thisStart, otherStop, isStartIncluded, isStopIncluded, outputData);
            }

            isStopIncluded = isStopIncluded || thisIsStopIncluded;
            return new TimeInterval(thisStart, thisStop, isStartIncluded, isStopIncluded, outputData);
        }

        return TimeInterval.EMPTY;
    };

    /**
     * Returns <code>true</code> if this interval contains the specified date.
     *
     * @param {JulianDate} date The date to check for.
     * @returns {Boolean} <code>true</code> if the TimeInterval contains the specified date, <code>false</code> otherwise.
     */
    TimeInterval.prototype.contains = function(date) {
        if (this.isEmpty) {
            return false;
        }

        var startComparedToDate = JulianDate.compare(this.start, date);
        // if (start == date)
        if (startComparedToDate === 0) {
            return this.isStartIncluded;
        }

        var dateComparedToStop = JulianDate.compare(date, this.stop);
        // if (date == stop)
        if (dateComparedToStop === 0) {
            return this.isStopIncluded;
        }

        // return start < date && date < stop
        return startComparedToDate < 0 && dateComparedToStop < 0;
    };

    /**
     * Compares this TimeInterval against the provided TimeInterval componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TimeInterval} [right] The right hand side Cartesian.
     * @param {Function} [dataComparer] A function which compares the data of the two intervals.  If ommitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    TimeInterval.prototype.equals = function(other, dataComparer) {
        return TimeInterval.equals(this, other, dataComparer);
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
    TimeInterval.prototype.equalsEpsilon = function(other, epsilon, dataComparer) {
        return TimeInterval.equalsEpsilon(this, other, epsilon, dataComparer);
    };

    return TimeInterval;
});