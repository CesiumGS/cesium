/*global define*/
define(['./binarySearch',
        './TimeInterval',
        './JulianDate'],
function(binarySearch,
         TimeInterval,
         JulianDate) {
    "use strict";

    function compareIntervalStartTimes(lhs, rhs) {
        return JulianDate.compare(lhs.start, rhs.start);
    }

    function TimeIntervalCollection() {
        this._intervals = [];
    }

    TimeIntervalCollection.prototype.get = function(index) {
        return this._intervals[index];
    };

    TimeIntervalCollection.prototype.getStart = function() {
        var thisIntervals = this._intervals;
        return thisIntervals.length === 0 ? undefined : thisIntervals[0].start;
    };

    TimeIntervalCollection.prototype.getStop = function() {
        var thisIntervals = this._intervals;
        var length = thisIntervals.length;
        return length === 0 ? undefined : thisIntervals[length - 1].stop;
    };

    TimeIntervalCollection.prototype.getLength = function() {
        return this._intervals.length;
    };

    TimeIntervalCollection.prototype.clear = function() {
        this._intervals = [];
    };

    TimeIntervalCollection.prototype.isEmpty = function() {
        return this._intervals.length === 0;
    };

    TimeIntervalCollection.prototype.findIntervalContainingDate = function(date) {
        var index = this.indexOf(date);
        return index >= 0 ? this._intervals[index] : undefined;
    };

    TimeIntervalCollection.prototype.contains = function(date) {
        return this.indexOf(date) >= 0;
    };

    TimeIntervalCollection.prototype.indexOf = function(date) {
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

    TimeIntervalCollection.prototype.addInterval = function(interval, dataComparer) {
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
                    if (typeof dataComparer !== 'undefined' ? dataComparer(thisIntervals[index - 1].data, interval.data) : (thisIntervals[index - 1].data === interval.data)) {
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
                    if (typeof dataComparer !== 'undefined' ? dataComparer(thisIntervals[index].data, interval.data) : thisIntervals[index].data === interval.data) {
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

    TimeIntervalCollection.prototype.removeInterval = function(interval) {
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

    TimeIntervalCollection.prototype.intersect = function(timeIntervalCollection, dataComparer, mergeCallback) {
        return this._intersectInternal(timeIntervalCollection, dataComparer, mergeCallback);
    };

    TimeIntervalCollection.prototype.intersectInterval = function(interval, dataComparer, mergeCallback) {
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval);
        return this._intersectInternal(intervals, dataComparer, mergeCallback);
    };

    TimeIntervalCollection.prototype._intersectInternal = function(intervals, dataComparer, mergeCallback) {
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
                var intersection = TimeInterval.EMPTY;
                if (typeof mergeCallback !== 'undefined' ||
                    typeof dataComparer === 'undefined' ||
                    dataComparer(leftInterval, rightInterval)) {
                    intersection = leftInterval.intersect(rightInterval, mergeCallback);
                }

                if (!intersection.isEmpty) {
                    // Since we start with an empty collection for 'result', and there are no overlapping intervals in 'this' (as a rule),
                    // the 'intersection' will never overlap with a previous interval in 'result'.  So, no need to do any additional 'merging'.
                    result.addInterval(intersection, dataComparer);
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