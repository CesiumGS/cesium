/*global define*/
define([
        './JulianDate',
        './DeveloperError'
    ], function(
        JulianDate,
        DeveloperError) {
    "use strict";

    var Characteristics_Closed = 0;
    var Characteristics_StartOpen = 1;
    var Characteristics_StopOpen = 2;
    var Characteristics_Empty = 4;

    function TimeInterval(start, stop, isStartIncluded, isStopIncluded, data) {
        if (typeof start === 'undefined') {
            throw new DeveloperError("start must be specified.", "start");
        }

        if (typeof stop === 'undefined') {
            throw new DeveloperError("stop must be specified.", "stop");
        }

        if (typeof isStartIncluded === 'undefined') {
            isStartIncluded = true;
        }

        if (typeof isStopIncluded === 'undefined') {
            isStopIncluded = true;
        }

        this.start = start;
        this.stop = stop;
        this.data = data;

        this._characteristics = Characteristics_Closed;
        if (!isStartIncluded)
            this._characteristics |= Characteristics_StartOpen;
        if (!isStopIncluded)
            this._characteristics |= Characteristics_StopOpen;

        var stopComparedToStart = JulianDate.compare(stop, start);
        // if (stop < start ||
        //     stop == start && open on either side
        if (stopComparedToStart < 0 || stopComparedToStart === 0 && this._characteristics !== Characteristics_Closed) {
            this._characteristics |= Characteristics_Empty;
        }

        this.isStartIncluded = (this._characteristics & Characteristics_StartOpen) !== Characteristics_StartOpen;
        this.isStopIncluded = (this._characteristics & Characteristics_StopOpen) !== Characteristics_StopOpen;
        this.isEmpty = (this._characteristics & Characteristics_Empty) === Characteristics_Empty;
    }

    TimeInterval.empty = new TimeInterval(new JulianDate(0, 0), new JulianDate(0, 0), false, false);

    TimeInterval.prototype.intersect = function(other) {
        return this.intersectMergingData(other, undefined);
    };

    TimeInterval.prototype.intersectMergingData = function(other, mergeCallback) {
        if (typeof other === 'undefined')
            return TimeInterval.empty;

        var otherStart = other.start, otherStop = other.stop, isStartIncluded, isStopIncluded, outputData;

        if (otherStart.greaterThanOrEquals(this.start) && this.stop.greaterThanOrEquals(otherStart)) {
            isStartIncluded = (!otherStart.equals(this.start) && other.isStartIncluded) || (this.isStartIncluded && other.isStartIncluded);
            isStopIncluded = this.isStopIncluded && other.isStopIncluded;

            outputData = typeof mergeCallback !== 'undefined' ? mergeCallback(this.data, other.data) : this.data;
            if (this.stop.greaterThanOrEquals(otherStop)) {
                isStopIncluded = isStopIncluded || (!otherStop.equals(this.stop) && other.isStopIncluded);
                return new TimeInterval(otherStart, otherStop, isStartIncluded, isStopIncluded, outputData);
            }

            isStopIncluded = isStopIncluded || this.isStopIncluded;
            return new TimeInterval(otherStart, this.stop, isStartIncluded, isStopIncluded, outputData);
        }

        if (otherStart.lessThanOrEquals(this.start) && this.start.lessThanOrEquals(otherStop)) {
            isStartIncluded = (otherStart.equals(this.start) === false && this.isStartIncluded) || (this.isStartIncluded && other.isStartIncluded);
            isStopIncluded = this.isStopIncluded && other.isStopIncluded;

            outputData = typeof mergeCallback !== 'undefined' ? mergeCallback(this.data, other.data) : this.data;
            if (this.stop.greaterThanOrEquals(otherStop)) {
                isStopIncluded = isStopIncluded || (otherStop.equals(this.stop) === false && other.isStopIncluded);
                return new TimeInterval(this.start, otherStop, isStartIncluded, isStopIncluded, outputData);
            }

            isStopIncluded = isStopIncluded || this.isStopIncluded;
            return new TimeInterval(this.start, this.stop, isStartIncluded, isStopIncluded, outputData);
        }

        return TimeInterval.empty;
    };

    TimeInterval.prototype.contains = function(date) {
        if (this.isEmpty)
            return false;

        var startComparedToDate = JulianDate.compare(this.start, date);
        // if (start == date)
        if (startComparedToDate === 0)
            return this.isStartIncluded;

        var dateComparedToStop = JulianDate.compare(date, this.stop);
        // if (date == stop)
        if (dateComparedToStop === 0)
            return this.isStopIncluded;

        // return start < date && date < stop
        return startComparedToDate < 0 && dateComparedToStop < 0;
    };

    TimeInterval.prototype.equals = function(other) {
        if (typeof other === 'undefined')
            return false;
        if (this.isEmpty && other.isEmpty)
            return true;
        return this._characteristics === other._characteristics && this.start.equals(other.start) && this.stop.equals(other.stop);
    };

    TimeInterval.prototype.equalsEpsilon = function(other, epsilon) {
        if (typeof other === 'undefined')
            return false;
        if (this.isEmpty && other.isEmpty)
            return true;
        return this._characteristics === other._characteristics && this.start.equalsEpsilon(other.start, epsilon) && this.stop.equalsEpsilon(other.stop, epsilon);
    };

    return TimeInterval;
});