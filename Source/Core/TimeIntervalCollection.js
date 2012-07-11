/*global define*/
define([
        './DeveloperError',
        './binarySearch',
        './TimeInterval',
        './JulianDate'
       ], function(
         DeveloperError,
         binarySearch,
         TimeInterval,
         JulianDate) {
    "use strict";

    function compareIntervalStartTimes(left, right) {
        return JulianDate.compare(left.start, right.start);
    }

    /**
     * A non-overlapping collection of TimeIntervals sorted by start date.
     *
     * @alias TimeIntervalCollection
     * @constructor
     *
     * @see TimeInterval
     * @see JulianDate
     *
     */
     var TimeIntervalCollection = function() {
        this._intervals = [];
    };

    /**
     * Gets the interval at the specified index.
     *
     * @memberof TimeIntervalCollection
     * @param {Number} index The index of the interval to retrieve.
     * @return {TimeInterval} The TimeInterval at the specified index, or undefined if no such index exists.
     * @exception {DeveloperError} index must be a number.
     */
    TimeIntervalCollection.prototype.get = function(index) {
        if (isNaN(index)) {
            throw new DeveloperError('index must be a number.');
        }
        return this._intervals[index];
    };

    /**
     * Gets the start date of the collection.
     *
     * @memberof TimeIntervalCollection
     * @return {JulianDate} The start date of the collection or undefined if the collection is empty.
     */
    TimeIntervalCollection.prototype.getStart = function() {
        var thisIntervals = this._intervals;
        return thisIntervals.length === 0 ? undefined : thisIntervals[0].start;
    };

    /**
     * Gets the stop date of the collection.
     *
     * @memberof TimeIntervalCollection
     * @return {JulianDate} The stop date of the collection or undefined if the collection is empty.
     */
    TimeIntervalCollection.prototype.getStop = function() {
        var thisIntervals = this._intervals;
        var length = thisIntervals.length;
        return length === 0 ? undefined : thisIntervals[length - 1].stop;
    };

    /**
     * Gets the number of intervals in the collection.
     *
     * @memberof TimeIntervalCollection
     * @return {Number} The number of intervals in the collection.
     */
    TimeIntervalCollection.prototype.getLength = function() {
        return this._intervals.length;
    };

    /**
     * Clears the collection.
     *
     * @memberof TimeIntervalCollection
     */
    TimeIntervalCollection.prototype.clear = function() {
        this._intervals = [];
    };

    /**
     * Returns true if the collection is empty, false otherwise.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns true if the collection is empty, false otherwise.
     */
    TimeIntervalCollection.prototype.isEmpty = function() {
        return this._intervals.length === 0;
    };

    /**
     * Returns the interval which contains the specified date.
     *
     * @param {JulianDate} date The date to search for.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns The interval containing the specified date, undefined if no such interval exists.
     *
     * @exception {DeveloperError} date is required.
     */
    TimeIntervalCollection.prototype.findIntervalContainingDate = function(date) {
        var index = this.indexOf(date);
        return index >= 0 ? this._intervals[index] : undefined;
    };

    /**
     * Returns true if the specified date is contained in the interval collection.
     *
     * @param {JulianDate} date The date to search for.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns True if the specified date is contained in the interval collection, undefined otherwise.
     *
     * @exception {DeveloperError} date is required.
     */
    TimeIntervalCollection.prototype.contains = function(date) {
        return this.indexOf(date) >= 0;
    };

    /**
     * Returns the index of the interval in the collection that contains the specified date.
     *
     * @param {JulianDate} date The date to search for.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns The index of the interval which contains the specified date, if no such interval exists,
     * it returns a negative number which is the bitwise complement of the index of the next interval that
     * starts after the date, or if no interval starts after the specified date, the bitwise complement of
     * the length of the collection.
     *
     * @exception {DeveloperError} date is required.
     */
    TimeIntervalCollection.prototype.indexOf = function(date) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date required');
        }
        var thisIntervals = this._intervals;
        var index = binarySearch(thisIntervals, new TimeInterval(date, date, true, true), compareIntervalStartTimes);
        if (index >= 0) {
            if (thisIntervals[index].isStartIncluded) {
                return index;
            }

            if (index > 0 &&
                thisIntervals[index - 1].stop.equals(date) &&
                thisIntervals[index - 1].isStopIncluded) {
                return index - 1;
            }
            return ~index;
        }

        index = ~index;
        if (index > 0 && (index - 1) < thisIntervals.length && thisIntervals[index - 1].contains(date)) {
            return index - 1;
        }
        return ~index;
    };

    /**
     * Returns the first interval in the collection that matches the specified parameters.
     * All parameters are optional and undefined parameters are treated as a don't care condition.
     *
     * @param {JulianDate} [start] The start of the interval.
     * @param {JulianDate} [stop] The end of the interval.
     * @param {JulianDate} [isStartIncluded] True if the start date is included.
     * @param {JulianDate} [isStopIncluded] True if the stop date is included.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns The first interval in the collection that matches the specified parameters.
     */
    TimeIntervalCollection.prototype.findInterval = function(start, stop, isStartIncluded, isStopIncluded) {
        var thisIntervals = this._intervals, interval;
        for ( var i = 0, len = thisIntervals.length; i < len; i++) {
            interval = thisIntervals[i];
            if ((typeof start === 'undefined' || interval.start.equals(start)) &&
                (typeof stop === 'undefined' || interval.stop.equals(stop)) &&
                (typeof isStartIncluded === 'undefined' || interval.isStartIncluded === isStartIncluded) &&
                (typeof isStopIncluded === 'undefined' || interval.isStopIncluded === isStopIncluded)) {
                return thisIntervals[i];
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
     * @param {Function} [equalsCallback] An optional function which takes the data from two
     * TimeIntervals and returns true if they are equal, false otherwise.  If this function
     * is not provided, the Javascript equality operator is used.
     *
     * @memberof TimeIntervalCollection
     *
     * @exception {DeveloperError} interval is required.
     */
    TimeIntervalCollection.prototype.addInterval = function(interval, equalsCallback) {
        if (typeof interval === 'undefined') {
            throw new DeveloperError("interval is required");
        }
        if (!interval.isEmpty) {
            var comparison, index;
            var thisIntervals = this._intervals;

            // Handle the common case quickly: we're adding a new interval which is after all existing intervals.
            if (thisIntervals.length === 0 ||
                interval.start.greaterThan(thisIntervals[thisIntervals.length - 1].stop)) {
                thisIntervals.push(interval);
                return;
            }

            // Keep the list sorted by the start date
            index = binarySearch(thisIntervals, interval, compareIntervalStartTimes);
            if (index < 0) {
                index = ~index;
            } else {
                // interval's start date exactly equals the start date of at least one interval in the collection.
                // It could actually equal the start date of two intervals if one of them does not actually
                // include the date.  In that case, the binary search could have found either.  We need to
                // look at the surrounding intervals and their IsStartIncluded properties in order to make sure
                // we're working with the correct interval.
                if (index > 0 &&
                    interval.isStartIncluded &&
                    thisIntervals[index - 1].isStartIncluded &&
                    thisIntervals[index - 1].start.equals(interval.start)) {
                    --index;
                } else if (index < thisIntervals.length &&
                           !interval.isStartIncluded &&
                           thisIntervals[index].isStartIncluded &&
                           thisIntervals[index].start.equals(interval.start)) {
                    ++index;
                }
            }

            if (index > 0) {
                // Not the first thing in the list, so see if the interval before this one
                // overlaps this one.
                comparison = JulianDate.compare(thisIntervals[index - 1].stop, interval.start);
                if (comparison > 0 || (comparison === 0 && (thisIntervals[index - 1].isStopIncluded || interval.isStartIncluded))) {
                    // There is an overlap
                    if (typeof equalsCallback !== 'undefined' ? equalsCallback(thisIntervals[index - 1].data, interval.data) : (thisIntervals[index - 1].data === interval.data)) {
                        // Overlapping intervals have the same data, so combine them
                        if (interval.stop.greaterThan(thisIntervals[index - 1].stop)) {
                            interval = new TimeInterval(thisIntervals[index - 1].start,
                                                        interval.stop,
                                                        thisIntervals[index - 1].isStartIncluded,
                                                        interval.isStopIncluded,
                                                        interval.data);
                        } else {
                            interval = new TimeInterval(thisIntervals[index - 1].start,
                                                        thisIntervals[index - 1].stop,
                                                        thisIntervals[index - 1].isStartIncluded,
                                                        thisIntervals[index - 1].isStopIncluded || (interval.stop.equals(thisIntervals[index - 1].stop) && interval.isStopIncluded),
                                                        interval.data);
                        }
                        thisIntervals.splice(index - 1, 1);
                        --index;
                    } else {
                        // Overlapping intervals have different data.  The new interval
                        // being added 'wins' so truncate the previous interval.
                        // If the existing interval extends past the end of the new one,
                        // split the existing interval into two intervals.
                        comparison = JulianDate.compare(thisIntervals[index - 1].stop, interval.stop);
                        if (comparison > 0 || (comparison === 0 && thisIntervals[index - 1].isStopIncluded && !interval.isStopIncluded)) {
                            thisIntervals.splice(index - 1, 1,
                                                 new TimeInterval(thisIntervals[index - 1].start,
                                                                  interval.start,
                                                                  thisIntervals[index - 1].isStartIncluded,
                                                                  !interval.isStartIncluded,
                                                                  thisIntervals[index - 1].data),
                                                 new TimeInterval(interval.stop,
                                                                  thisIntervals[index - 1].stop,
                                                                  !interval.isStopIncluded,
                                                                  thisIntervals[index - 1].isStopIncluded,
                                                                  thisIntervals[index - 1].data));
                        } else {
                            thisIntervals[index - 1] = new TimeInterval(thisIntervals[index - 1].start,
                                                                        interval.start,
                                                                        thisIntervals[index - 1].isStartIncluded,
                                                                        !interval.isStartIncluded, thisIntervals[index - 1].data);
                        }
                    }
                }
            }

            while (index < thisIntervals.length) {
                // Not the last thing in the list, so see if the intervals after this one overlap this one.
                comparison = JulianDate.compare(interval.stop, thisIntervals[index].start);
                if (comparison > 0 ||
                    (comparison === 0 && (interval.isStopIncluded || thisIntervals[index].isStartIncluded))) {
                    // There is an overlap
                    if (typeof equalsCallback !== 'undefined' ? equalsCallback(thisIntervals[index].data, interval.data) : thisIntervals[index].data === interval.data) {
                        // Overlapping intervals have the same data, so combine them
                        interval = new TimeInterval(interval.start,
                                                    thisIntervals[index].stop.greaterThan(interval.stop) ? thisIntervals[index].stop : interval.stop,
                                                    interval.isStartIncluded,
                                                    thisIntervals[index].stop.greaterThan(interval.stop) ? thisIntervals[index].isStopIncluded : interval.isStopIncluded,
                                                    interval.data);
                        thisIntervals.splice(index, 1);
                    } else {
                        // Overlapping intervals have different data.  The new interval
                        // being added 'wins' so truncate the next interval.
                        thisIntervals[index] = new TimeInterval(interval.stop,
                                                                thisIntervals[index].stop,
                                                                !interval.isStopIncluded,
                                                                thisIntervals[index].isStopIncluded,
                                                                thisIntervals[index].data);
                        if (thisIntervals[index].isEmpty) {
                            thisIntervals.splice(index, 1);
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
            thisIntervals.splice(index, 0, interval);
        }
    };

    /**
     * Removes the specified interval from this interval collection, creating a hole over the specified interval.
     * The Data property of the input interval is ignored.
     *
     * @param {TimeInterval} interval The interval to remove.
     *
     * @memberof TimeIntervalCollection
     *
     * @returns true if the interval was removed, false if no part of the interval was in the collection.
     *
     * @exception {DeveloperError} interval is required.
     */
    TimeIntervalCollection.prototype.removeInterval = function(interval) {
        if (typeof interval === 'undefined') {
            throw new DeveloperError("interval is required");
        }

        if (interval.isEmpty) {
            return false;
        }

        var result = false;
        var thisIntervals = this._intervals;

        var index = binarySearch(thisIntervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        }

        var intervalStart = interval.start;
        var intervalStop = interval.stop;
        var intervalIsStartIncluded = interval.isStartIncluded;
        var intervalIsStopIncluded = interval.isStopIncluded;

        // Check for truncation of the end of the previous interval.
        if (index > 0) {
            var indexMinus1 = thisIntervals[index - 1];
            var indexMinus1Stop = indexMinus1.stop;
            if (indexMinus1Stop.greaterThan(intervalStart) ||
                (indexMinus1Stop.equals(intervalStart) &&
                 indexMinus1.isStopIncluded && intervalIsStartIncluded)) {
                result = true;

                if (indexMinus1Stop.greaterThan(intervalStop) ||
                    (indexMinus1.isStopIncluded && !intervalIsStopIncluded && indexMinus1Stop.equals(intervalStop))) {
                    // Break the existing interval into two pieces
                    thisIntervals.splice(index, 0, new TimeInterval(intervalStop, indexMinus1Stop, !intervalIsStopIncluded, indexMinus1.isStopIncluded, indexMinus1.data));
                }
                thisIntervals[index - 1] = new TimeInterval(indexMinus1.start, intervalStart, indexMinus1.isStartIncluded, !intervalIsStartIncluded, indexMinus1.data);
            }
        }

        // Check if the Start of the current interval should remain because interval.start is the same but
        // it is not included.
        var indexInterval = thisIntervals[index];
        if (index < thisIntervals.length &&
            !intervalIsStartIncluded &&
            indexInterval.isStartIncluded &&
            intervalStart.equals(indexInterval.start)) {
            result = true;

            thisIntervals.splice(index, 0, new TimeInterval(indexInterval.start, indexInterval.start, true, true, indexInterval.data));
            ++index;
            indexInterval = thisIntervals[index];
        }

        // Remove any intervals that are completely overlapped by the input interval.
        while (index < thisIntervals.length &&
                intervalStop.greaterThan(indexInterval.stop)) {
            result = true;
            thisIntervals.splice(index, 1);
        }

        // Check for the case where the input interval ends on the same date
        // as an existing interval.
        if (index < thisIntervals.length && intervalStop.equals(indexInterval.stop)) {
            result = true;

            if (!intervalIsStopIncluded && indexInterval.isStopIncluded) {
                // Last point of interval should remain because the stop date is included in
                // the existing interval but is not included in the input interval.
                if ((index + 1) < thisIntervals.length && thisIntervals[index + 1].start.equals(intervalStop) && indexInterval.data === thisIntervals[index + 1].data) {
                    // Combine single point with the next interval
                    thisIntervals.splice(index, 1);
                    thisIntervals[index] = indexInterval = new TimeInterval(indexInterval.start, indexInterval.stop, true, indexInterval.isStopIncluded, indexInterval.data);
                } else {
                    thisIntervals[index] = indexInterval = new TimeInterval(intervalStop, intervalStop, true, true, indexInterval.data);
                }
            } else {
                // Interval is completely overlapped
                thisIntervals.splice(index, 1);
            }
        }

        // Truncate any partially-overlapped intervals.
        if (index < thisIntervals.length &&
            (intervalStop.greaterThan(indexInterval.start) ||
             (intervalStop.equals(indexInterval.start) &&
              intervalIsStopIncluded &&
              indexInterval.isStartIncluded))) {
            result = true;
            thisIntervals[index] = new TimeInterval(intervalStop, indexInterval.stop, !intervalIsStopIncluded, indexInterval.isStopIncluded, indexInterval.data);
        }

        return result;
    };

    /**
     * Creates a new TimeIntervalCollection which is the intersection of this collection
     * and the provided collection.
     *
     * @param {TimeIntervalCollection} timeIntervalCollection The collection to intersect with.
     * @param {Function} [equalsCallback] An optional function which takes the data from two
     * TimeIntervals and returns true if they are equal, false otherwise.  If this function
     * is not provided, the Javascript equality operator is used.
     * @param {Function} [mergeCallback] An optional function which takes the data from two
     * TimeIntervals and returns a merged version of the data.  If this parameter is omitted,
     * the interval data from <code>this</code> collection will be used.
     *
     * @returns A new TimeIntervalCollection which is the intersection of this collection and the provided collection.
     *
     * @memberof TimeIntervalCollection
     *
     * @exception {DeveloperError} timeIntervalCollection is required.
     */
    TimeIntervalCollection.prototype.intersect = function(timeIntervalCollection, equalsCallback, mergeCallback) {
        if (typeof timeIntervalCollection === 'undefined') {
            throw new DeveloperError('timeIntervalCollection is required.');
        }
        return this._intersectInternal(timeIntervalCollection, equalsCallback, mergeCallback);
    };

    /**
     * Creates a new TimeIntervalCollection which is the intersection of this collection
     * and the provided interval.
     *
     * @param {TimeInterval} interval The interval to intersect with.
     * @param {Function} [equalsCallback] An optional function which takes the data from two
     * TimeIntervals and returns true if they are equal, false otherwise.  If this function
     * is not provided, the equality operator will be used.
     * @param {Function} [mergeCallback] An optional function which takes the data from two
     * TimeIntervals and returns a merged version of the data.  If this parameter is omitted,
     * the interval data from <code>this</code> collection will be used.
     *
     * @returns A new TimeIntervalCollection which is the intersection of this collection and the provided collection.
     *
     * @memberof TimeIntervalCollection
     *
     * @exception {DeveloperError} timeIntervalCollection is required.
     */
    TimeIntervalCollection.prototype.intersectInterval = function(interval, equalsCallback, mergeCallback) {
        if (typeof interval === 'undefined') {
            throw new DeveloperError('interval is required.');
        }
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval);
        return this._intersectInternal(intervals, equalsCallback, mergeCallback);
    };

    TimeIntervalCollection.prototype._intersectInternal = function(intervals, equalsCallback, mergeCallback) {
        var left = 0;
        var right = 0;
        var result = new TimeIntervalCollection();
        var thisIntervals = this._intervals;
        var otherIntervals = intervals._intervals;

        while (left < thisIntervals.length && right < otherIntervals.length) {
            var leftInterval = thisIntervals[left];
            var rightInterval = otherIntervals[right];
            if (leftInterval.stop.lessThan(rightInterval.start)) {
                ++left;
            } else if (rightInterval.stop.lessThan(leftInterval.start)) {
                ++right;
            } else {
                // The following will return an intersection whose data is 'merged' if the callback is defined
                if (typeof mergeCallback !== 'undefined' ||
                   ((typeof equalsCallback !== 'undefined' && equalsCallback(leftInterval, rightInterval)) ||
                    (typeof equalsCallback === 'undefined' && rightInterval.data === leftInterval.data))) {

                    var intersection = leftInterval.intersect(rightInterval, mergeCallback);
                    if (!intersection.isEmpty) {
                        // Since we start with an empty collection for 'result', and there are no overlapping intervals in 'this' (as a rule),
                        // the 'intersection' will never overlap with a previous interval in 'result'.  So, no need to do any additional 'merging'.
                        result.addInterval(intersection, equalsCallback);
                    }
                }

                if (leftInterval.stop.lessThan(rightInterval.stop) ||
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
