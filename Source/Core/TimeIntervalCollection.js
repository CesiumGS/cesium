/*global define*/
define([
        './binarySearch',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Event',
        './JulianDate',
        './TimeInterval'
    ], function(
        binarySearch,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        TimeInterval) {
    'use strict';

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
            throw new DeveloperError("interval is required");
        }
        //>>includeEnd('debug');

        if (interval.isEmpty) {
            return;
        }

        var comparison;
        var index;
        var intervals = this._intervals;

        // Handle the common case quickly: we're adding a new interval which is after all existing intervals.
        if (intervals.length === 0 || JulianDate.greaterThan(interval.start, intervals[intervals.length - 1].stop)) {
            intervals.push(interval);
            this._changedEvent.raiseEvent(this);
            return;
        }

        // Keep the list sorted by the start date
        index = binarySearch(intervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        } else {
            // interval's start date exactly equals the start date of at least one interval in the collection.
            // It could actually equal the start date of two intervals if one of them does not actually
            // include the date.  In that case, the binary search could have found either.  We need to
            // look at the surrounding intervals and their IsStartIncluded properties in order to make sure
            // we're working with the correct interval.
            if (index > 0 && interval.isStartIncluded && intervals[index - 1].isStartIncluded && intervals[index - 1].start.equals(interval.start)) {
                --index;
            } else if (index < intervals.length && !interval.isStartIncluded && intervals[index].isStartIncluded && intervals[index].start.equals(interval.start)) {
                ++index;
            }
        }

        if (index > 0) {
            // Not the first thing in the list, so see if the interval before this one
            // overlaps this one.
            comparison = JulianDate.compare(intervals[index - 1].stop, interval.start);
            if (comparison > 0 || (comparison === 0 && (intervals[index - 1].isStopIncluded || interval.isStartIncluded))) {
                // There is an overlap
                if (defined(dataComparer) ? dataComparer(intervals[index - 1].data, interval.data) : (intervals[index - 1].data === interval.data)) {
                    // Overlapping intervals have the same data, so combine them
                    if (JulianDate.greaterThan(interval.stop, intervals[index - 1].stop)) {
                        interval = new TimeInterval({
                            start : intervals[index - 1].start,
                            stop : interval.stop,
                            isStartIncluded : intervals[index - 1].isStartIncluded,
                            isStopIncluded : interval.isStopIncluded,
                            data : interval.data
                        });
                    } else {
                        interval = new TimeInterval({
                            start : intervals[index - 1].start,
                            stop : intervals[index - 1].stop,
                            isStartIncluded : intervals[index - 1].isStartIncluded,
                            isStopIncluded : intervals[index - 1].isStopIncluded || (interval.stop.equals(intervals[index - 1].stop) && interval.isStopIncluded),
                            data : interval.data
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
                    if (comparison > 0 || (comparison === 0 && intervals[index - 1].isStopIncluded && !interval.isStopIncluded)) {
                        intervals.splice(index - 1, 1, new TimeInterval({
                            start : intervals[index - 1].start,
                            stop : interval.start,
                            isStartIncluded : intervals[index - 1].isStartIncluded,
                            isStopIncluded : !interval.isStartIncluded,
                            data : intervals[index - 1].data
                        }), new TimeInterval({
                            start : interval.stop,
                            stop : intervals[index - 1].stop,
                            isStartIncluded : !interval.isStopIncluded,
                            isStopIncluded : intervals[index - 1].isStopIncluded,
                            data : intervals[index - 1].data
                        }));
                    } else {
                        intervals[index - 1] = new TimeInterval({
                            start : intervals[index - 1].start,
                            stop : interval.start,
                            isStartIncluded : intervals[index - 1].isStartIncluded,
                            isStopIncluded : !interval.isStartIncluded,
                            data : intervals[index - 1].data
                        });
                    }
                }
            }
        }

        while (index < intervals.length) {
            // Not the last thing in the list, so see if the intervals after this one overlap this one.
            comparison = JulianDate.compare(interval.stop, intervals[index].start);
            if (comparison > 0 || (comparison === 0 && (interval.isStopIncluded || intervals[index].isStartIncluded))) {
                // There is an overlap
                if (defined(dataComparer) ? dataComparer(intervals[index].data, interval.data) : intervals[index].data === interval.data) {
                    // Overlapping intervals have the same data, so combine them
                    interval = new TimeInterval({
                        start : interval.start,
                        stop : JulianDate.greaterThan(intervals[index].stop, interval.stop) ? intervals[index].stop : interval.stop,
                        isStartIncluded : interval.isStartIncluded,
                        isStopIncluded : JulianDate.greaterThan(intervals[index].stop, interval.stop) ? intervals[index].isStopIncluded : interval.isStopIncluded,
                        data : interval.data
                    });
                    intervals.splice(index, 1);
                } else {
                    // Overlapping intervals have different data.  The new interval
                    // being added 'wins' so truncate the next interval.
                    intervals[index] = new TimeInterval({
                        start : interval.stop,
                        stop : intervals[index].stop,
                        isStartIncluded : !interval.isStopIncluded,
                        isStopIncluded : intervals[index].isStopIncluded,
                        data : intervals[index].data
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
     * @returns <code>true</code> if the interval was removed, <code>false</code> if no part of the interval was in the collection.
     */
    TimeIntervalCollection.prototype.removeInterval = function(interval) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(interval)) {
            throw new DeveloperError("interval is required");
        }
        //>>includeEnd('debug');

        if (interval.isEmpty) {
            return false;
        }

        var result = false;
        var intervals = this._intervals;

        var index = binarySearch(intervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        }

        var intervalStart = interval.start;
        var intervalStop = interval.stop;
        var intervalIsStartIncluded = interval.isStartIncluded;
        var intervalIsStopIncluded = interval.isStopIncluded;

        // Check for truncation of the end of the previous interval.
        if (index > 0) {
            var indexMinus1 = intervals[index - 1];
            var indexMinus1Stop = indexMinus1.stop;
            if (JulianDate.greaterThan(indexMinus1Stop, intervalStart) ||
                (TimeInterval.equals(indexMinus1Stop, intervalStart) &&
                 indexMinus1.isStopIncluded && intervalIsStartIncluded)) {
                result = true;

                if (JulianDate.greaterThan(indexMinus1Stop, intervalStop) ||
                    (indexMinus1.isStopIncluded && !intervalIsStopIncluded && TimeInterval.equals(indexMinus1Stop, intervalStop))) {
                    // Break the existing interval into two pieces
                    intervals.splice(index, 0, new TimeInterval({
                        start : intervalStop,
                        stop : indexMinus1Stop,
                        isStartIncluded : !intervalIsStopIncluded,
                        isStopIncluded : indexMinus1.isStopIncluded,
                        data : indexMinus1.data
                    }));
                }
                intervals[index - 1] = new TimeInterval({
                    start : indexMinus1.start,
                    stop : intervalStart,
                    isStartIncluded : indexMinus1.isStartIncluded,
                    isStopIncluded : !intervalIsStartIncluded,
                    data : indexMinus1.data
                });
            }
        }

        // Check if the Start of the current interval should remain because interval.start is the same but
        // it is not included.
        var indexInterval = intervals[index];
        if (index < intervals.length &&
            !intervalIsStartIncluded &&
            indexInterval.isStartIncluded &&
            intervalStart.equals(indexInterval.start)) {
            result = true;

            intervals.splice(index, 0, new TimeInterval({
                start : indexInterval.start,
                stop : indexInterval.start,
                isStartIncluded : true,
                isStopIncluded : true,
                data : indexInterval.data
            }));
            ++index;
            indexInterval = intervals[index];
        }

        // Remove any intervals that are completely overlapped by the input interval.
        while (index < intervals.length && JulianDate.greaterThan(intervalStop, indexInterval.stop)) {
            result = true;
            intervals.splice(index, 1);
            indexInterval = intervals[index];
        }

        // Check for the case where the input interval ends on the same date
        // as an existing interval.
        if (index < intervals.length && intervalStop.equals(indexInterval.stop)) {
            result = true;

            if (!intervalIsStopIncluded && indexInterval.isStopIncluded) {
                // Last point of interval should remain because the stop date is included in
                // the existing interval but is not included in the input interval.
                if ((index + 1) < intervals.length && intervals[index + 1].start.equals(intervalStop) && indexInterval.data === intervals[index + 1].data) {
                    // Combine single point with the next interval
                    intervals.splice(index, 1);
                    indexInterval = new TimeInterval({
                        start : indexInterval.start,
                        stop : indexInterval.stop,
                        isStartIncluded : true,
                        isStopIncluded : indexInterval.isStopIncluded,
                        data : indexInterval.data
                    });
                } else {
                    indexInterval = new TimeInterval({
                        start : intervalStop,
                        stop : intervalStop,
                        isStartIncluded : true,
                        isStopIncluded : true,
                        data : indexInterval.data
                    });
                }
                intervals[index] = indexInterval;
            } else {
                // Interval is completely overlapped
                intervals.splice(index, 1);
            }
        }

        // Truncate any partially-overlapped intervals.
        if (index < intervals.length &&
            (JulianDate.greaterThan(intervalStop, indexInterval.start) ||
             (intervalStop.equals(indexInterval.start) &&
              intervalIsStopIncluded &&
              indexInterval.isStartIncluded))) {
            result = true;
            intervals[index] = new TimeInterval({
                start : intervalStop,
                stop : indexInterval.stop,
                isStartIncluded : !intervalIsStopIncluded,
                isStopIncluded : indexInterval.isStopIncluded,
                data : indexInterval.data
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

        var left = 0;
        var right = 0;
        var result = new TimeIntervalCollection();
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
                    (leftInterval.stop.equals(rightInterval.stop) &&
                     !leftInterval.isStopIncluded &&
                     rightInterval.isStopIncluded)) {
                    ++left;
                } else {
                    ++right;
                }
            }
        }
        return result;
    };

    return TimeIntervalCollection;
});
