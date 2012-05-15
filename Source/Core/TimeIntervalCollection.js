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

    function intersectInternal(that, intervals, dataComparer, mergeCallback) {
        var result = new TimeIntervalCollection();

        var left = 0, right = 0;

        if (typeof intervals === 'undefined') {
            result.addIntervals(that);
            return result;
        }

        var otherIntervals = intervals._intervals;
        while (left < that._intervals.length && right < otherIntervals.length) {
            if (that._intervals[left].stop.lessThan(otherIntervals[right].start)) {
                ++left;
            } else if (otherIntervals[right].stop.lessThan(that._intervals[left].start)) {
                ++right;
            } else {
                // The following will return an intersection whose data is "merged" if the callback is non-null
                var intersection = typeof mergeCallback === 'undefined' ? that._intervals[left].intersect(otherIntervals[right], dataComparer) : that._intervals[left].intersectMergingData(
                        otherIntervals[right], mergeCallback);
                if (!intersection.isEmpty) {
                    // Since we start with an empty collection for "result", and there are no overlapping intervals in "that" (as a rule),
                    // the "intersection" will never overlap with a previous interval in "result".  So, no need to do any additional "merging".
                    result.add(intersection, dataComparer);
                }

                if (that._intervals[left].stop.lessThan(otherIntervals[right].stop) ||
                        (that._intervals[left].stop.equals(otherIntervals[right].stop) && !that._intervals[left].isStopIncluded && otherIntervals[right].isStopIncluded)) {
                    ++left;
                } else {
                    ++right;
                }
            }
        }

        return result;
    }

    function TimeIntervalCollection() {
        this._intervals = [];
    }

    TimeIntervalCollection.empty = new TimeIntervalCollection();

    //TODO Do we want a JulianDate.MinimumValue, JulianDate.MaximumValue to use for here?
    TimeIntervalCollection.infinite = new TimeIntervalCollection();

    TimeIntervalCollection.prototype.getStart = function() {
        //TODO what if _intervals is empty?  Components apparently doesn't check?
        return this._intervals[0].start;
    };

    TimeIntervalCollection.prototype.getStop = function() {
        //TODO what if _intervals is empty?  Components apparently doesn't check?
        return this._intervals[this._intervals.length - 1].stop;
    };

    TimeIntervalCollection.prototype.getLength = function() {
        return this._intervals.length;
    };

    TimeIntervalCollection.prototype.addIntervalCollection = function(intervals, dataComparer) {
        for ( var i = 0, len = intervals.length; i < len; ++i) {
            this.addInterval(intervals[i], dataComparer);
        }
    };

    TimeIntervalCollection.prototype.addInterval = function(interval, dataComparer) {
        if (!interval.isEmpty) {
            var comparison, index;

            // Handle the common case quickly: we're adding a new interval which is after all existing intervals.
            if (this._intervals.length === 0 || interval.start.greaterThan(this._intervals[this._intervals.length - 1].stop)) {
                this._intervals.push(interval);
                return;
            }

            // Keep the list sorted by the start date
            index = binarySearch(this._intervals, interval, compareIntervalStartTimes);
            if (index < 0) {
                index = ~index;
            } else {
                // interval's start date exactly equals the start date of at least one interval in the collection.
                // It could actually equal the start date of two intervals if one of them does not actually
                // include the date.  In that case, the binary search could have found either.  We need to
                // look at the surrounding intervals and their IsStartIncluded properties in order to make sure
                // we're working with the correct interval.
                if (index > 0 && interval.isStartIncluded && this._intervals[index - 1].isStartIncluded && this._intervals[index - 1].start.equals(interval.start)) {
                    --index;
                } else if (index < this._intervals.length && !interval.isStartIncluded && this._intervals[index].isStartIncluded && this._intervals[index].start.equals(interval.start)) {
                    ++index;
                }
            }

            if (index > 0) {
                // Not the first thing in the list, so see if the interval before this one
                // overlaps this one.

                comparison = JulianDate.compare(this._intervals[index - 1].stop, interval.start);
                if (comparison > 0 || (comparison === 0 && (this._intervals[index - 1].isStopIncluded || interval.isStartIncluded))) {
                    // There is an overlap
                    if (typeof dataComparer !== 'undefined' ? dataComparer(this._intervals[index - 1].data, interval.data) : (this._intervals[index - 1].data === interval.data)) {
                        // Overlapping intervals have the same data, so combine them
                        if (interval.stop.greaterThan(this._intervals[index - 1].stop)) {
                            interval = new TimeInterval(this._intervals[index - 1].start, interval.stop, this._intervals[index - 1].isStartIncluded, interval.isStopIncluded, interval.data);
                        } else {
                            interval = new TimeInterval(this._intervals[index - 1].start, this._intervals[index - 1].stop, this._intervals[index - 1].isStartIncluded,
                                    this._intervals[index - 1].isStopIncluded || (interval.stop.equals(this._intervals[index - 1].stop) && interval.isStopIncluded), interval.data);
                        }
                        this._intervals.splice(index - 1, 1);
                        --index;
                    } else {
                        // Overlapping intervals have different data.  The new interval
                        // being added "wins" so truncate the previous interval.
                        // If the existing interval extends past the end of the new one,
                        // split the existing interval into two intervals.
                        comparison = JulianDate.compare(this._intervals[index - 1].stop, interval.stop);
                        if (comparison > 0 || (comparison === 0 && this._intervals[index - 1].isStopIncluded && !interval.isStopIncluded)) {
                            this._intervals.splice(index, 0, new TimeInterval(interval.stop, this._intervals[index - 1].stop, !interval.isStopIncluded,
                                    this._intervals[index - 1].isStopIncluded, this._intervals[index - 1].data));
                            this._intervals[index - 1] = new TimeInterval(this._intervals[index - 1].start, interval.start, this._intervals[index - 1].isStartIncluded,
                                    !interval.isStartIncluded, this._intervals[index - 1].data);
                        } else {
                            this._intervals[index - 1] = new TimeInterval(this._intervals[index - 1].start, interval.start, this._intervals[index - 1].isStartIncluded,
                                    !interval.isStartIncluded, this._intervals[index - 1].data);
                        }
                    }
                }
            }

            while (index < this._intervals.length) {
                // Not the last thing in the list, so see if the intervals after this one
                // overlap this one.

                comparison = JulianDate.compare(interval.stop, this._intervals[index].start);
                if (comparison > 0 || (comparison === 0 && (interval.isStopIncluded || this._intervals[index].isStartIncluded))) {
                    // There is an overlap
                    if (typeof dataComparer !== 'undefined' ? dataComparer(this._intervals[index].data, interval.data) : this._intervals[index].data === interval.data) {
                        // Overlapping intervals have the same data, so combine them
                        interval = new TimeInterval(interval.start, this._intervals[index].stop.greaterThan(interval.stop) ? this._intervals[index].stop : interval.stop,
                                interval.isStartIncluded, this._intervals[index].stop.greaterThan(interval.stop) ? this._intervals[index].isStopIncluded : interval.isStopIncluded,
                                interval.data);
                        this._intervals.splice(index, 1);
                    } else {
                        // Overlapping intervals have different data.  The new interval
                        // being added "wins" so truncate the next interval.
                        this._intervals[index] = new TimeInterval(interval.stop, this._intervals[index].stop, !interval.isStopIncluded, this._intervals[index].isStopIncluded,
                                this._intervals[index].data);
                        if (this._intervals[index].isEmpty) {
                            this._intervals.splice(index, 1);
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
            this._intervals.splice(index, 0, interval);
        }
    };

    TimeIntervalCollection.prototype.addIntervalMergingData = function(item, mergeCallback) {
        var temp = new TimeIntervalCollection();
        temp.addInterval(item);
        this.addIntervalCollectionMergingData(temp, mergeCallback);
    };

    TimeIntervalCollection.prototype.addIntervalCollectionMergingData = function(items, mergeCallback) {
        var otherUnion = new TimeIntervalCollection();
        otherUnion.addIntervalCollection(items);
        var intersections = this.intersectInternal(this, items, undefined, mergeCallback);
        for ( var i = 0; i < intersections.length; i++) {
            var intersection = intersections[i];
            // Add the intersected piece and clobber the existing data with the "merged" data
            this.addInterval(intersection);
            // Remove the already merged interval from consideration
            otherUnion.remove(intersection);
        }
        // Make sure to add the remaining (new) pieces of "items" which may not already intersect
        // Items in "this" which don't intersect with "items" will continue to exist in "this" unhindered
        this.addIntervalCollection(otherUnion);
    };

    TimeIntervalCollection.prototype.intersectInterval = function(interval, dataComparer) {
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval);
        return this.intersectInternal(this, intervals, dataComparer);
    };

    TimeIntervalCollection.prototype.intersectIntervalCollection = function(intervals, dataComparer) {
        // Conduct the usual intersection, but instead of an actual merge function, just accept "this" data
        return this.intersectInternal(this, intervals, dataComparer);
    };

    TimeIntervalCollection.prototype.clear = function() {
        this._intervals = [];
    };

    TimeIntervalCollection.prototype.isEmpty = function() {
        return this._intervals.length === 0;
    };

    //TODO: See TimeIntervalCollection.infinite
    //    TimeIntervalCollection.prototype.isInfinite = function() {
    //        return this._intervals.length == 1 &&
    //        !this._intervals[0].start.greaterThan(JulianDate.minValue) &&
    //        !this._intervals[0].stop.lessThan(JulianDate.maxValue);
    //    };

    TimeIntervalCollection.prototype.indexOf = function(date) {
        var interval = new TimeInterval(date, date, true, true);
        var index = binarySearch(this._intervals, interval, compareIntervalStartTimes);
        if (index >= 0) {
            if (this._intervals[index].isStartIncluded) {
                return index;
            }

            if (index > 0 && this._intervals[index - 1].stop.equals(date) && this._intervals[index - 1].isStopIncluded) {
                return index - 1;
            }

            return ~index;
        }

        index = ~index;
        if (index > 0 && (index - 1) < this._intervals.length && this._intervals[index - 1].contains(date)) {
            return index - 1;
        }
        return ~index;
    };

    TimeIntervalCollection.prototype.findIntervalContainingDate = function(date) {
        var index = this.indexOf(date);
        return index >= 0 ? this._intervals[index] : undefined;
    };

    TimeIntervalCollection.prototype.contains = function(date) {
        return this.indexOf(date) >= 0;
    };

    TimeIntervalCollection.prototype.findInterval = function(start, stop, isStartIncluded, isStopIncluded) {
        var thisIntervals = this._intervals, interval;
        for ( var i = 0, len = thisIntervals.length; i < len; i++) {
            interval = thisIntervals[i];
            if ((typeof start === 'undefined' || interval.start.equals(start)) && (typeof stop === 'undefined' || interval.stop.equals(start)) &&
                    (typeof isStartIncluded === 'undefined' || interval.isStartIncluded === isStartIncluded) && (typeof start === 'undefined' || interval.isStopIncluded === isStopIncluded)) {
                return thisIntervals[i];
            }
        }
        return undefined;
    };

    TimeIntervalCollection.prototype.removeInterval = function(interval) {
        if (interval.isEmpty) {
            return false;
        }

        var index = binarySearch(this._intervals, interval, compareIntervalStartTimes);
        if (index < 0) {
            index = ~index;
        }

        var result = false;

        // Check for truncation of the end of the previous interval.
        if (index > 0 &&
                (this._intervals[index - 1].stop.greaterThan(interval.start) || (this._intervals[index - 1].stop.equals(interval.start) && this._intervals[index - 1].isStopIncluded && interval.isStartIncluded))) {
            result = true;

            if (this._intervals[index - 1].stop.greaterThan(interval.stop) ||
                    (this._intervals[index - 1].isStopIncluded && !interval.isStopIncluded && this._intervals[index - 1].stop.equals(interval.stop))) {
                // Break the existing interval into two pieces
                this._intervals.splice(index, 0, new TimeInterval(interval.stop, this._intervals[index - 1].stop, !interval.isStopIncluded, this._intervals[index - 1].isStopIncluded,
                        this._intervals[index - 1].data));
            }
            this._intervals[index - 1] = new TimeInterval(this._intervals[index - 1].start, interval.start, this._intervals[index - 1].isStartIncluded, !interval.isStartIncluded,
                    this._intervals[index - 1].data);
        }

        // Check if the Start of the current interval should remain because interval.start is the same but
        // it is not included.
        if (index < this._intervals.length && !interval.isStartIncluded && this._intervals[index].isStartIncluded && interval.start.equals(this._intervals[index].start)) {
            result = true;

            this._intervals.splice(index, 0, new TimeInterval(this._intervals[index].start, this._intervals[index].start, true, true, this._intervals[index].data));
            ++index;
        }

        // Remove any intervals that are completely overlapped by the input interval.
        while (index < this._intervals.length && interval.stop.greaterThan(this._intervals[index].stop)) {
            result = true;
            this._intervals.splice(index, 1);
        }

        // Check for the case where the input interval ends on the same date
        // as an existing interval.
        if (index < this._intervals.length && interval.stop.equals(this._intervals[index].stop)) {
            result = true;

            if (!interval.isStopIncluded && this._intervals[index].isStopIncluded) {
                // Last point of interval should remain because the stop date is included in
                // the existing interval but is not included in the input interval.
                if ((index + 1) < this._intervals.length && this._intervals[index + 1].start.equals(interval.stop) && this._intervals[index].data === this._intervals[index + 1].data) {
                    // Combine single point with the next interval
                    this._intervals.splice(index, 1);
                    this._intervals[index] = new TimeInterval(this._intervals[index].start, this._intervals[index].stop, true, this._intervals[index].isStopIncluded,
                            this._intervals[index].data);
                } else {
                    this._intervals[index] = new TimeInterval(interval.stop, interval.stop, true, true, this._intervals[index].data);
                }
            } else {
                // Interval is completely overlapped
                this._intervals.splice(index, 1);
            }
        }

        // Truncate any partially-overlapped intervals.
        if (index < this._intervals.length &&
                (interval.stop.greaterThan(this._intervals[index].start) || (interval.stop.equals(this._intervals[index].start) && interval.isStopIncluded && this._intervals[index].isStartIncluded))) {
            result = true;
            this._intervals[index] = new TimeInterval(interval.stop, this._intervals[index].stop, !interval.isStopIncluded, this._intervals[index].isStopIncluded, this._intervals[index].data);
        }

        return result;
    };

    return TimeIntervalCollection;
});