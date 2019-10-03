import binarySearch from './binarySearch.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import defineProperties from './defineProperties.js';
import DeveloperError from './DeveloperError.js';
import Event from './Event.js';
import GregorianDate from './GregorianDate.js';
import isLeapYear from './isLeapYear.js';
import Iso8601 from './Iso8601.js';
import JulianDate from './JulianDate.js';
import TimeInterval from './TimeInterval.js';

    function compareIntervalStartTimes(left, right) {
        return JulianDate.compare(left.start, right.start);
    }

    /**
     * A non-overlapping collection of {@link TimeInterval} instances sorted by start time.
     * @alias TimeIntervalCollection
     * @constructor
     *
     * @param {TimeInterval[]} [intervals] An array of intervals to add to the collection.
     */
    function TimeIntervalCollection(intervals) {
        this._intervals = [];
        this._changedEvent = new Event();

        if (defined(intervals)) {
            var length = intervals.length;
            for (var i = 0; i < length; i++) {
                this.addInterval(intervals[i]);
            }
        }
    }

    defineProperties(TimeIntervalCollection.prototype, {
        /**
         * Gets an event that is raised whenever the collection of intervals change.
         * @memberof TimeIntervalCollection.prototype
         * @type {Event}
         * @readonly
         */
        changedEvent : {
            get : function() {
                return this._changedEvent;
            }
        },

        /**
         * Gets the start time of the collection.
         * @memberof TimeIntervalCollection.prototype
         * @type {JulianDate}
         * @readonly
         */
        start : {
            get : function() {
                var intervals = this._intervals;
                return intervals.length === 0 ? undefined : intervals[0].start;
            }
        },

        /**
         * Gets whether or not the start time is included in the collection.
         * @memberof TimeIntervalCollection.prototype
         * @type {Boolean}
         * @readonly
         */
        isStartIncluded : {
            get : function() {
                var intervals = this._intervals;
                return intervals.length === 0 ? false : intervals[0].isStartIncluded;
            }
        },

        /**
         * Gets the stop time of the collection.
         * @memberof TimeIntervalCollection.prototype
         * @type {JulianDate}
         * @readonly
         */
        stop : {
            get : function() {
                var intervals = this._intervals;
                var length = intervals.length;
                return length === 0 ? undefined : intervals[length - 1].stop;
            }
        },

        /**
         * Gets whether or not the stop time is included in the collection.
         * @memberof TimeIntervalCollection.prototype
         * @type {Boolean}
         * @readonly
         */
        isStopIncluded : {
            get : function() {
                var intervals = this._intervals;
                var length = intervals.length;
                return length === 0 ? false : intervals[length - 1].isStopIncluded;
            }
        },

        /**
         * Gets the number of intervals in the collection.
         * @memberof TimeIntervalCollection.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._intervals.length;
            }
        },

        /**
         * Gets whether or not the collection is empty.
         * @memberof TimeIntervalCollection.prototype
         * @type {Boolean}
         * @readonly
         */
        isEmpty : {
            get : function() {
                return this._intervals.length === 0;
            }
        }
    });

    /**
     * Compares this instance against the provided instance componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TimeIntervalCollection} [right] The right hand side collection.
     * @param {TimeInterval~DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    TimeIntervalCollection.prototype.equals = function(right, dataComparer) {
        if (this === right) {
            return true;
        }
        if (!(right instanceof TimeIntervalCollection)) {
            return false;
        }
        var intervals = this._intervals;
        var rightIntervals = right._intervals;
        var length = intervals.length;
        if (length !== rightIntervals.length) {
            return false;
        }
        for (var i = 0; i < length; i++) {
            if (!TimeInterval.equals(intervals[i], rightIntervals[i], dataComparer)) {
                return false;
            }
        }
        return true;
    };

    /**
     * Gets the interval at the specified index.
     *
     * @param {Number} index The index of the interval to retrieve.
     * @returns {TimeInterval} The interval at the specified index, or <code>undefined</code> if no interval exists as that index.
     */
    TimeIntervalCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._intervals[index];
    };

    /**
     * Removes all intervals from the collection.
     */
    TimeIntervalCollection.prototype.removeAll = function() {
        if (this._intervals.length > 0) {
            this._intervals.length = 0;
            this._changedEvent.raiseEvent(this);
        }
    };

    /**
     * Finds and returns the interval that contains the specified date.
     *
     * @param {JulianDate} date The date to search for.
     * @returns {TimeInterval|undefined} The interval containing the specified date, <code>undefined</code> if no such interval exists.
     */
    TimeIntervalCollection.prototype.findIntervalContainingDate = function(date) {
        var index = this.indexOf(date);
        return index >= 0 ? this._intervals[index] : undefined;
    };

    /**
     * Finds and returns the data for the interval that contains the specified date.
     *
     * @param {JulianDate} date The date to search for.
     * @returns {Object} The data for the interval containing the specified date, or <code>undefined</code> if no such interval exists.
     */
    TimeIntervalCollection.prototype.findDataForIntervalContainingDate = function(date) {
        var index = this.indexOf(date);
        return index >= 0 ? this._intervals[index].data : undefined;
    };

    /**
     * Checks if the specified date is inside this collection.
     *
     * @param {JulianDate} julianDate The date to check.
     * @returns {Boolean} <code>true</code> if the collection contains the specified date, <code>false</code> otherwise.
     */
    TimeIntervalCollection.prototype.contains = function(julianDate) {
        return this.indexOf(julianDate) >= 0;
    };

    var indexOfScratch = new TimeInterval();

    /**
     * Finds and returns the index of the interval in the collection that contains the specified date.
     *
     * @param {JulianDate} date The date to search for.
     * @returns {Number} The index of the interval that contains the specified date, if no such interval exists,
     * it returns a negative number which is the bitwise complement of the index of the next interval that
     * starts after the date, or if no interval starts after the specified date, the bitwise complement of
     * the length of the collection.
     */
    TimeIntervalCollection.prototype.indexOf = function(date) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(date)) {
            throw new DeveloperError('date is required');
        }
        //>>includeEnd('debug');

        var intervals = this._intervals;
        indexOfScratch.start = date;
        indexOfScratch.stop = date;
        var index = binarySearch(intervals, indexOfScratch, compareIntervalStartTimes);
        if (index >= 0) {
            if (intervals[index].isStartIncluded) {
                return index;
            }

            if (index > 0 && intervals[index - 1].stop.equals(date) && intervals[index - 1].isStopIncluded) {
                return index - 1;
            }
            return ~index;
        }

        index = ~index;
        if (index > 0 && (index - 1) < intervals.length && TimeInterval.contains(intervals[index - 1], date)) {
            return index - 1;
        }
        return ~index;
    };

    /**
     * Returns the first interval in the collection that matches the specified parameters.
     * All parameters are optional and <code>undefined</code> parameters are treated as a don't care condition.
     *
     * @param {Object} [options] Object with the following properties:
     * @param {JulianDate} [options.start] The start time of the interval.
     * @param {JulianDate} [options.stop] The stop time of the interval.
     * @param {Boolean} [options.isStartIncluded] <code>true</code> if <code>options.start</code> is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.isStopIncluded] <code>true</code> if <code>options.stop</code> is included in the interval, <code>false</code> otherwise.
     * @returns {TimeInterval} The first interval in the collection that matches the specified parameters.
     */
    TimeIntervalCollection.prototype.findInterval = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var start = options.start;
        var stop = options.stop;
        var isStartIncluded = options.isStartIncluded;
        var isStopIncluded = options.isStopIncluded;

        var intervals = this._intervals;
        for (var i = 0, len = intervals.length; i < len; i++) {
            var interval = intervals[i];
            if ((!defined(start) || interval.start.equals(start)) &&
                (!defined(stop) || interval.stop.equals(stop)) &&
                (!defined(isStartIncluded) || interval.isStartIncluded === isStartIncluded) &&
                (!defined(isStopIncluded) || interval.isStopIncluded === isStopIncluded)) {
                return intervals[i];
            }
        }
        return undefined;
    };

    /**
     * Adds an interval to the collection, merging intervals that contain the same data and
     * splitting intervals of different data as needed in order to maintain a non-overlapping collection.
     * The data in the new interval takes precedence over any existing intervals in the collection.
     *
     * @param {TimeInterval} interval The interval to add.
     * @param {TimeInterval~DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     */
    TimeIntervalCollection.prototype.addInterval = function(interval, dataComparer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(interval)) {
            throw new DeveloperError('interval is required');
        }
        //>>includeEnd('debug');

        if (interval.isEmpty) {
            return;
        }

        var intervals = this._intervals;

        // Handle the common case quickly: we're adding a new interval which is after all existing intervals.
        if (intervals.length === 0 || JulianDate.greaterThan(interval.start, intervals[intervals.length - 1].stop)) {
            intervals.push(interval);
            this._changedEvent.raiseEvent(this);
            return;
        }

        // Keep the list sorted by the start date
        var index = binarySearch(intervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        } else {
            // interval's start date exactly equals the start date of at least one interval in the collection.
            // It could actually equal the start date of two intervals if one of them does not actually
            // include the date.  In that case, the binary search could have found either.  We need to
            // look at the surrounding intervals and their IsStartIncluded properties in order to make sure
            // we're working with the correct interval.

            // eslint-disable-next-line no-lonely-if
            if (index > 0 &&
                interval.isStartIncluded &&
                intervals[index - 1].isStartIncluded &&
                intervals[index - 1].start.equals(interval.start)) {

                --index;
            } else if (index < intervals.length &&
                !interval.isStartIncluded &&
                intervals[index].isStartIncluded &&
                intervals[index].start.equals(interval.start)) {

                ++index;
            }
        }

        var comparison;
        if (index > 0) {
            // Not the first thing in the list, so see if the interval before this one
            // overlaps this one.

            comparison = JulianDate.compare(intervals[index - 1].stop, interval.start);
            if (comparison > 0 ||
                (comparison === 0 &&
                    (intervals[index - 1].isStopIncluded || interval.isStartIncluded))) {
                // There is an overlap
                if (defined(dataComparer) ? dataComparer(intervals[index - 1].data, interval.data) : (intervals[index - 1].data === interval.data)) {
                    // Overlapping intervals have the same data, so combine them
                    if (JulianDate.greaterThan(interval.stop, intervals[index - 1].stop)) {
                        interval = new TimeInterval({
                            start: intervals[index - 1].start,
                            stop: interval.stop,
                            isStartIncluded: intervals[index - 1].isStartIncluded,
                            isStopIncluded: interval.isStopIncluded,
                            data: interval.data
                        });
                    } else {
                        interval = new TimeInterval({
                            start: intervals[index - 1].start,
                            stop: intervals[index - 1].stop,
                            isStartIncluded: intervals[index - 1].isStartIncluded,
                            isStopIncluded: intervals[index - 1].isStopIncluded || (interval.stop.equals(intervals[index - 1].stop) && interval.isStopIncluded),
                            data: interval.data
                        });
                    }
                    intervals.splice(index - 1, 1);
                    --index;
                } else {
                    // Overlapping intervals have different data.  The new interval
                    // being added 'wins' so truncate the previous interval.
                    // If the existing interval extends past the end of the new one,
                    // split the existing interval into two intervals.
                    comparison = JulianDate.compare(intervals[index - 1].stop, interval.stop);
                    if (comparison > 0 ||
                        (comparison === 0 && intervals[index - 1].isStopIncluded && !interval.isStopIncluded)) {

                        intervals.splice(index, 0, new TimeInterval({
                            start: interval.stop,
                            stop: intervals[index - 1].stop,
                            isStartIncluded: !interval.isStopIncluded,
                            isStopIncluded: intervals[index - 1].isStopIncluded,
                            data: intervals[index - 1].data
                        }));
                    }
                    intervals[index - 1] = new TimeInterval({
                        start: intervals[index - 1].start,
                        stop: interval.start,
                        isStartIncluded: intervals[index - 1].isStartIncluded,
                        isStopIncluded: !interval.isStartIncluded,
                        data: intervals[index - 1].data
                    });
                }
            }
        }

        while (index < intervals.length) {
            // Not the last thing in the list, so see if the intervals after this one overlap this one.
            comparison = JulianDate.compare(interval.stop, intervals[index].start);
            if (comparison > 0 ||
                (comparison === 0 && (interval.isStopIncluded || intervals[index].isStartIncluded))) {
                // There is an overlap
                if (defined(dataComparer) ? dataComparer(intervals[index].data, interval.data) : intervals[index].data === interval.data) {
                    // Overlapping intervals have the same data, so combine them
                    interval = new TimeInterval({
                        start: interval.start,
                        stop: JulianDate.greaterThan(intervals[index].stop, interval.stop) ? intervals[index].stop : interval.stop,
                        isStartIncluded: interval.isStartIncluded,
                        isStopIncluded: JulianDate.greaterThan(intervals[index].stop, interval.stop) ? intervals[index].isStopIncluded : interval.isStopIncluded,
                        data: interval.data
                    });
                    intervals.splice(index, 1);
                } else {
                    // Overlapping intervals have different data.  The new interval
                    // being added 'wins' so truncate the next interval.
                    intervals[index] = new TimeInterval({
                        start: interval.stop,
                        stop: intervals[index].stop,
                        isStartIncluded: !interval.isStopIncluded,
                        isStopIncluded: intervals[index].isStopIncluded,
                        data: intervals[index].data
                    });

                    if (intervals[index].isEmpty) {
                        intervals.splice(index, 1);
                    } else {
                        // Found a partial span, so it is not possible for the next
                        // interval to be spanned at all.  Stop looking.
                        break;
                    }
                }
            } else {
                // Found the last one we're spanning, so stop looking.
                break;
            }
        }

        // Add the new interval
        intervals.splice(index, 0, interval);
        this._changedEvent.raiseEvent(this);
    };

    /**
     * Removes the specified interval from this interval collection, creating a hole over the specified interval.
     * The data property of the input interval is ignored.
     *
     * @param {TimeInterval} interval The interval to remove.
     * @returns {Boolean} <code>true</code> if the interval was removed, <code>false</code> if no part of the interval was in the collection.
     */
    TimeIntervalCollection.prototype.removeInterval = function(interval) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(interval)) {
            throw new DeveloperError('interval is required');
        }
        //>>includeEnd('debug');

        if (interval.isEmpty) {
            return false;
        }

        var intervals = this._intervals;

        var index = binarySearch(intervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        }

        var result = false;

        // Check for truncation of the end of the previous interval.
        if (index > 0 &&
            (JulianDate.greaterThan(intervals[index - 1].stop, interval.start) ||
                (intervals[index - 1].stop.equals(interval.start) && intervals[index - 1].isStopIncluded && interval.isStartIncluded))) {

            result = true;

            if (JulianDate.greaterThan(intervals[index - 1].stop, interval.stop) ||
                (intervals[index - 1].isStopIncluded && !interval.isStopIncluded && intervals[index - 1].stop.equals(interval.stop))) {
                // Break the existing interval into two pieces
                intervals.splice(index, 0, new TimeInterval({
                    start: interval.stop,
                    stop: intervals[index - 1].stop,
                    isStartIncluded: !interval.isStopIncluded,
                    isStopIncluded: intervals[index - 1].isStopIncluded,
                    data: intervals[index - 1].data
                }));
            }
            intervals[index - 1] = new TimeInterval({
                start: intervals[index - 1].start,
                stop: interval.start,
                isStartIncluded: intervals[index - 1].isStartIncluded,
                isStopIncluded: !interval.isStartIncluded,
                data: intervals[index - 1].data
            });
        }

        // Check if the Start of the current interval should remain because interval.start is the same but
        // it is not included.
        if (index < intervals.length &&
            !interval.isStartIncluded &&
            intervals[index].isStartIncluded &&
            interval.start.equals(intervals[index].start)) {

            result = true;

            intervals.splice(index, 0, new TimeInterval({
                start: intervals[index].start,
                stop: intervals[index].start,
                isStartIncluded: true,
                isStopIncluded: true,
                data: intervals[index].data
            }));
            ++index;
        }

        // Remove any intervals that are completely overlapped by the input interval.
        while (index < intervals.length && JulianDate.greaterThan(interval.stop, intervals[index].stop)) {
            result = true;
            intervals.splice(index, 1);
        }

        // Check for the case where the input interval ends on the same date
        // as an existing interval.
        if (index < intervals.length && interval.stop.equals(intervals[index].stop)) {
            result = true;

            if (!interval.isStopIncluded && intervals[index].isStopIncluded) {
                // Last point of interval should remain because the stop date is included in
                // the existing interval but is not included in the input interval.
                if (index + 1 < intervals.length &&
                    intervals[index + 1].start.equals(interval.stop) &&
                    intervals[index].data === intervals[index + 1].data) {
                    // Combine single point with the next interval
                    intervals.splice(index, 1);
                    intervals[index] = new TimeInterval({
                        start: intervals[index].start,
                        stop: intervals[index].stop,
                        isStartIncluded: true,
                        isStopIncluded: intervals[index].isStopIncluded,
                        data: intervals[index].data
                    });
                } else {
                    intervals[index] = new TimeInterval({
                        start: interval.stop,
                        stop: interval.stop,
                        isStartIncluded: true,
                        isStopIncluded: true,
                        data: intervals[index].data
                    });
                }
            } else {
                // Interval is completely overlapped
                intervals.splice(index, 1);
            }
        }

        // Truncate any partially-overlapped intervals.
        if (index < intervals.length &&
            (JulianDate.greaterThan(interval.stop, intervals[index].start) ||
                (interval.stop.equals(intervals[index].start) && interval.isStopIncluded && intervals[index].isStartIncluded))) {

            result = true;
            intervals[index] = new TimeInterval({
                start: interval.stop,
                stop: intervals[index].stop,
                isStartIncluded: !interval.isStopIncluded,
                isStopIncluded: intervals[index].isStopIncluded,
                data: intervals[index].data
            });
        }

        if (result) {
            this._changedEvent.raiseEvent(this);
        }

        return result;
    };

    /**
     * Creates a new instance that is the intersection of this collection and the provided collection.
     *
     * @param {TimeIntervalCollection} other The collection to intersect with.
     * @param {TimeInterval~DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
     * @param {TimeInterval~MergeCallback} [mergeCallback] A function which merges the data of the two intervals. If omitted, the data from the left interval will be used.
     * @returns {TimeIntervalCollection} A new TimeIntervalCollection which is the intersection of this collection and the provided collection.
     */
    TimeIntervalCollection.prototype.intersect = function(other, dataComparer, mergeCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(other)) {
            throw new DeveloperError('other is required.');
        }
        //>>includeEnd('debug');

        var result = new TimeIntervalCollection();
        var left = 0;
        var right = 0;
        var intervals = this._intervals;
        var otherIntervals = other._intervals;

        while (left < intervals.length && right < otherIntervals.length) {
            var leftInterval = intervals[left];
            var rightInterval = otherIntervals[right];
            if (JulianDate.lessThan(leftInterval.stop, rightInterval.start)) {
                ++left;
            } else if (JulianDate.lessThan(rightInterval.stop, leftInterval.start)) {
                ++right;
            } else {
                // The following will return an intersection whose data is 'merged' if the callback is defined
                if (defined(mergeCallback) ||
                    ((defined(dataComparer) && dataComparer(leftInterval.data, rightInterval.data)) ||
                        (!defined(dataComparer) && rightInterval.data === leftInterval.data))) {

                    var intersection = TimeInterval.intersect(leftInterval, rightInterval, new TimeInterval(), mergeCallback);
                    if (!intersection.isEmpty) {
                        // Since we start with an empty collection for 'result', and there are no overlapping intervals in 'this' (as a rule),
                        // the 'intersection' will never overlap with a previous interval in 'result'.  So, no need to do any additional 'merging'.
                        result.addInterval(intersection, dataComparer);
                    }
                }

                if (JulianDate.lessThan(leftInterval.stop, rightInterval.stop) ||
                    (leftInterval.stop.equals(rightInterval.stop) && !leftInterval.isStopIncluded && rightInterval.isStopIncluded)) {

                    ++left;
                } else {
                    ++right;
                }
            }
        }
        return result;
    };

    /**
     * Creates a new instance from a JulianDate array.
     *
     * @param {Object} options Object with the following properties:
     * @param {JulianDate[]} options.julianDates An array of ISO 8601 dates.
     * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if start time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if stop time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.leadingInterval=false] <code>true</code> if you want to add a interval from Iso8601.MINIMUM_VALUE to start time,  <code>false</code> otherwise.
     * @param {Boolean} [options.trailingInterval=false] <code>true</code> if you want to add a interval from stop time to Iso8601.MAXIMUM_VALUE,  <code>false</code> otherwise.
     * @param {Function} [options.dataCallback] A function that will be return the data that is called with each interval before it is added to the collection. If unspecified, the data will be the index in the collection.
     * @param {TimeIntervalCollection} [result] An existing instance to use for the result.
     * @returns {TimeIntervalCollection} The modified result parameter or a new instance if none was provided.
     */
    TimeIntervalCollection.fromJulianDateArray = function(options, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.julianDates)) {
            throw new DeveloperError('options.iso8601Array is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new TimeIntervalCollection();
        }

        var julianDates = options.julianDates;
        var length = julianDates.length;
        var dataCallback = options.dataCallback;

        var isStartIncluded = defaultValue(options.isStartIncluded, true);
        var isStopIncluded = defaultValue(options.isStopIncluded, true);
        var leadingInterval = defaultValue(options.leadingInterval, false);
        var trailingInterval = defaultValue(options.trailingInterval, false);
        var interval;

        // Add a default interval, which will only end up being used up to first interval
        var startIndex = 0;
        if (leadingInterval) {
            ++startIndex;
            interval = new TimeInterval({
                start : Iso8601.MINIMUM_VALUE,
                stop : julianDates[0],
                isStartIncluded : true,
                isStopIncluded : !isStartIncluded
            });
            interval.data = defined(dataCallback) ? dataCallback(interval, result.length) : result.length;
            result.addInterval(interval);
        }

        for (var i = 0; i < length - 1; ++i) {
            var startDate = julianDates[i];
            var endDate = julianDates[i + 1];

            interval = new TimeInterval({
                start : startDate,
                stop : endDate,
                isStartIncluded : (result.length === startIndex) ? isStartIncluded : true,
                isStopIncluded : (i === (length - 2)) ? isStopIncluded : false
            });
            interval.data = defined(dataCallback) ? dataCallback(interval, result.length) : result.length;
            result.addInterval(interval);

            startDate = endDate;
        }

        if (trailingInterval) {
            interval = new TimeInterval({
                start : julianDates[length - 1],
                stop : Iso8601.MAXIMUM_VALUE,
                isStartIncluded : !isStopIncluded,
                isStopIncluded : true
            });
            interval.data = defined(dataCallback) ? dataCallback(interval, result.length) : result.length;
            result.addInterval(interval);
        }

        return result;
    };

    var scratchGregorianDate = new GregorianDate();
    var monthLengths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    /**
     * Adds duration represented as a GregorianDate to a JulianDate
     *
     * @param {JulianDate} julianDate The date.
     * @param {GregorianDate} duration An duration represented as a GregorianDate.
     * @param {JulianDate} result An existing instance to use for the result.
     * @returns {JulianDate} The modified result parameter.
     *
     * @private
     */
    function addToDate(julianDate, duration, result) {
        if (!defined(result)) {
            result = new JulianDate();
        }
        JulianDate.toGregorianDate(julianDate, scratchGregorianDate);

        var millisecond = scratchGregorianDate.millisecond + duration.millisecond;
        var second = scratchGregorianDate.second + duration.second;
        var minute = scratchGregorianDate.minute + duration.minute;
        var hour = scratchGregorianDate.hour + duration.hour;
        var day = scratchGregorianDate.day + duration.day;
        var month = scratchGregorianDate.month + duration.month;
        var year = scratchGregorianDate.year + duration.year;

        if (millisecond >= 1000) {
            second += Math.floor(millisecond / 1000);
            millisecond = millisecond % 1000;
        }

        if (second >= 60) {
            minute += Math.floor(second / 60);
            second = second % 60;
        }

        if (minute >= 60) {
            hour += Math.floor(minute / 60);
            minute = minute % 60;
        }

        if (hour >= 24) {
            day += Math.floor(hour / 24);
            hour = hour % 24;
        }

        // If days is greater than the month's length we need to remove those number of days,
        //  readjust month and year and repeat until days is less than the month's length.
        monthLengths[2] = isLeapYear(year) ? 29 : 28;
        while ((day > monthLengths[month]) || (month >= 13)) {
            if (day > monthLengths[month]) {
                day -= monthLengths[month];
                ++month;
            }

            if (month >= 13) {
                --month;
                year += Math.floor(month / 12);
                month = month % 12;
                ++month;
            }

            monthLengths[2] = isLeapYear(year) ? 29 : 28;
        }

        scratchGregorianDate.millisecond = millisecond;
        scratchGregorianDate.second = second;
        scratchGregorianDate.minute = minute;
        scratchGregorianDate.hour = hour;
        scratchGregorianDate.day = day;
        scratchGregorianDate.month = month;
        scratchGregorianDate.year = year;

        return JulianDate.fromGregorianDate(scratchGregorianDate, result);
    }

    var scratchJulianDate = new JulianDate();
    var durationRegex = /P(?:([\d.,]+)Y)?(?:([\d.,]+)M)?(?:([\d.,]+)W)?(?:([\d.,]+)D)?(?:T(?:([\d.,]+)H)?(?:([\d.,]+)M)?(?:([\d.,]+)S)?)?/;

    /**
     * Parses ISO8601 duration string
     *
     * @param {String} iso8601 An ISO 8601 duration.
     * @param {GregorianDate} result An existing instance to use for the result.
     * @returns {Boolean} True is parsing succeeded, false otherwise
     *
     * @private
     */
    function parseDuration(iso8601, result) {
        if (!defined(iso8601) || iso8601.length === 0) {
            return false;
        }

        // Reset object
        result.year = 0;
        result.month = 0;
        result.day = 0;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        result.millisecond = 0;

        if (iso8601[0] === 'P') {
            var matches = iso8601.match(durationRegex);
            if (!defined(matches)) {
                return false;
            }
            if (defined(matches[1])) { // Years
                result.year = Number(matches[1].replace(',', '.'));
            }
            if (defined(matches[2])) { // Months
                result.month = Number(matches[2].replace(',', '.'));
            }
            if (defined(matches[3])) { // Weeks
                result.day = Number(matches[3].replace(',', '.')) * 7;
            }
            if (defined(matches[4])) { // Days
                result.day += Number(matches[4].replace(',', '.'));
            }
            if (defined(matches[5])) { // Hours
                result.hour = Number(matches[5].replace(',', '.'));
            }
            if (defined(matches[6])) { // Weeks
                result.minute = Number(matches[6].replace(',', '.'));
            }
            if (defined(matches[7])) { // Seconds
                var seconds = Number(matches[7].replace(',', '.'));
                result.second = Math.floor(seconds);
                result.millisecond = (seconds % 1) * 1000;
            }
        } else {
            // They can technically specify the duration as a normal date with some caveats. Try our best to load it.
            if (iso8601[iso8601.length - 1] !== 'Z') { // It's not a date, its a duration, so it always has to be UTC
                iso8601 += 'Z';
            }
            JulianDate.toGregorianDate(JulianDate.fromIso8601(iso8601, scratchJulianDate), result);
        }

        // A duration of 0 will cause an infinite loop, so just make sure something is non-zero
        return (result.year || result.month || result.day || result.hour ||
                result.minute || result.second || result.millisecond);
    }

    var scratchDuration = new GregorianDate();
    /**
     * Creates a new instance from an {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} time interval (start/end/duration).
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.iso8601 An ISO 8601 interval.
     * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if start time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if stop time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.leadingInterval=false] <code>true</code> if you want to add a interval from Iso8601.MINIMUM_VALUE to start time,  <code>false</code> otherwise.
     * @param {Boolean} [options.trailingInterval=false] <code>true</code> if you want to add a interval from stop time to Iso8601.MAXIMUM_VALUE,  <code>false</code> otherwise.
     * @param {Function} [options.dataCallback] A function that will be return the data that is called with each interval before it is added to the collection. If unspecified, the data will be the index in the collection.
     * @param {TimeIntervalCollection} [result] An existing instance to use for the result.
     * @returns {TimeIntervalCollection} The modified result parameter or a new instance if none was provided.
     */
    TimeIntervalCollection.fromIso8601 = function(options, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.iso8601)) {
            throw new DeveloperError('options.iso8601 is required.');
        }
        //>>includeEnd('debug');

        var dates = options.iso8601.split('/');
        var start = JulianDate.fromIso8601(dates[0]);
        var stop = JulianDate.fromIso8601(dates[1]);
        var julianDates = [];

        if (!parseDuration(dates[2], scratchDuration)) {
            julianDates.push(start, stop);
        } else {
            var date = JulianDate.clone(start);
            julianDates.push(date);
            while (JulianDate.compare(date, stop) < 0) {
                date = addToDate(date, scratchDuration);
                var afterStop = (JulianDate.compare(stop, date) <= 0);
                if (afterStop) {
                    JulianDate.clone(stop, date);
                }

                julianDates.push(date);
            }
        }

        return TimeIntervalCollection.fromJulianDateArray({
            julianDates : julianDates,
            isStartIncluded : options.isStartIncluded,
            isStopIncluded : options.isStopIncluded,
            leadingInterval : options.leadingInterval,
            trailingInterval : options.trailingInterval,
            dataCallback : options.dataCallback
        }, result);
    };

    /**
     * Creates a new instance from a {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} date array.
     *
     * @param {Object} options Object with the following properties:
     * @param {String[]} options.iso8601Dates An array of ISO 8601 dates.
     * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if start time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if stop time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.leadingInterval=false] <code>true</code> if you want to add a interval from Iso8601.MINIMUM_VALUE to start time,  <code>false</code> otherwise.
     * @param {Boolean} [options.trailingInterval=false] <code>true</code> if you want to add a interval from stop time to Iso8601.MAXIMUM_VALUE,  <code>false</code> otherwise.
     * @param {Function} [options.dataCallback] A function that will be return the data that is called with each interval before it is added to the collection. If unspecified, the data will be the index in the collection.
     * @param {TimeIntervalCollection} [result] An existing instance to use for the result.
     * @returns {TimeIntervalCollection} The modified result parameter or a new instance if none was provided.
     */
    TimeIntervalCollection.fromIso8601DateArray = function(options, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.iso8601Dates)) {
            throw new DeveloperError('options.iso8601Dates is required.');
        }
        //>>includeEnd('debug');

        return TimeIntervalCollection.fromJulianDateArray({
            julianDates : options.iso8601Dates.map(function(date) {
                return JulianDate.fromIso8601(date);
            }),
            isStartIncluded : options.isStartIncluded,
            isStopIncluded : options.isStopIncluded,
            leadingInterval : options.leadingInterval,
            trailingInterval : options.trailingInterval,
            dataCallback : options.dataCallback
        }, result);
    };

    /**
     * Creates a new instance from a {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} duration array.
     *
     * @param {Object} options Object with the following properties:
     * @param {JulianDate} options.epoch An date that the durations are relative to.
     * @param {String} options.iso8601Durations An array of ISO 8601 durations.
     * @param {Boolean} [options.relativeToPrevious=false] <code>true</code> if durations are relative to previous date, <code>false</code> if always relative to the epoch.
     * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if start time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if stop time is included in the interval, <code>false</code> otherwise.
     * @param {Boolean} [options.leadingInterval=false] <code>true</code> if you want to add a interval from Iso8601.MINIMUM_VALUE to start time,  <code>false</code> otherwise.
     * @param {Boolean} [options.trailingInterval=false] <code>true</code> if you want to add a interval from stop time to Iso8601.MAXIMUM_VALUE,  <code>false</code> otherwise.
     * @param {Function} [options.dataCallback] A function that will be return the data that is called with each interval before it is added to the collection. If unspecified, the data will be the index in the collection.
     * @param {TimeIntervalCollection} [result] An existing instance to use for the result.
     * @returns {TimeIntervalCollection} The modified result parameter or a new instance if none was provided.
     */
    TimeIntervalCollection.fromIso8601DurationArray = function(options, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.epoch)) {
            throw new DeveloperError('options.epoch is required.');
        }
        if (!defined(options.iso8601Durations)) {
            throw new DeveloperError('options.iso8601Durations is required.');
        }
        //>>includeEnd('debug');

        var epoch = options.epoch;
        var iso8601Durations = options.iso8601Durations;
        var relativeToPrevious = defaultValue(options.relativeToPrevious, false);
        var julianDates = [];
        var date, previousDate;

        var length = iso8601Durations.length;
        for (var i = 0; i < length; ++i) {
            // Allow a duration of 0 on the first iteration, because then it is just the epoch
            if (parseDuration(iso8601Durations[i], scratchDuration) || i === 0) {
                if (relativeToPrevious && defined(previousDate)) {
                    date = addToDate(previousDate, scratchDuration);
                } else {
                    date = addToDate(epoch, scratchDuration);
                }
                julianDates.push(date);
                previousDate = date;
            }
        }

        return TimeIntervalCollection.fromJulianDateArray({
            julianDates : julianDates,
            isStartIncluded : options.isStartIncluded,
            isStopIncluded : options.isStopIncluded,
            leadingInterval : options.leadingInterval,
            trailingInterval : options.trailingInterval,
            dataCallback : options.dataCallback
        }, result);
    };
export default TimeIntervalCollection;
