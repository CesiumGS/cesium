/*global define*/
define(['Core/JulianDate', 'Core/DeveloperError'], function(JulianDate, DeveloperError) {
    "use strict";

    var TimeIntervalCharacteristics = {
        Closed : 0,
        StartOpen : 1,
        StopOpen : 2,
        Empty : 4
    };

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

        this.Start = start;
        this.Stop = stop;
        this.Data = data;

        this._characteristics = TimeIntervalCharacteristics.Closed;
        if (!isStartIncluded)
            this._characteristics |= TimeIntervalCharacteristics.StartOpen;
        if (!isStopIncluded)
            this._characteristics |= TimeIntervalCharacteristics.StopOpen;

        var stopComparedToStart = JulianDate.compare(stop, start);
        // if (stop < start ||
        //     stop == start && open on either side
        if (stopComparedToStart < 0 || stopComparedToStart === 0 && this._characteristics !== TimeIntervalCharacteristics.Closed) {
            this._characteristics |= TimeIntervalCharacteristics.Empty;
        }

        this.IsStartIncluded = (this._characteristics & TimeIntervalCharacteristics.StartOpen) !== TimeIntervalCharacteristics.StartOpen;
        this.IsStopIncluded = (this._characteristics & TimeIntervalCharacteristics.StopOpen) !== TimeIntervalCharacteristics.StopOpen;
        this.IsEmpty = (this._characteristics & TimeIntervalCharacteristics.Empty) === TimeIntervalCharacteristics.Empty;
    }

    TimeInterval.empty = new TimeInterval(new JulianDate(0.0), new JulianDate(0.0), false, false);

    TimeInterval.prototype.intersect = function(other) {
        if (typeof other === 'undefined')
            return TimeInterval.empty;

        var isStartIncluded, isStopIncluded;
        var otherStart = other.Start;
        var otherStop = other.Stop;

        if (!otherStart.isBefore(this.Start) && !this.Stop.isBefore(otherStart)) {
            isStartIncluded = (!otherStart.equals(this.Start) && other.IsStartIncluded) || (this.IsStartIncluded && other.IsStartIncluded);
            isStopIncluded = this.IsStopIncluded && other.IsStopIncluded;

            if (!this.Stop.isBefore(otherStop)) {
                isStopIncluded = isStopIncluded || !otherStop.equals(this.Stop) && other.IsStopIncluded;
                return new TimeInterval(otherStart, otherStop, isStartIncluded, isStopIncluded);
            }

            isStopIncluded = isStopIncluded || this.IsStopIncluded;
            return new TimeInterval(otherStart, this.Stop, isStartIncluded, isStopIncluded);
        }

        if (!otherStart.isAfter(this.Start) && !this.Start.isAfter(otherStop)) {
            isStartIncluded = (!otherStart.equals(this.Start) && this.IsStartIncluded) || (this.IsStartIncluded && other.IsStartIncluded);
            isStopIncluded = this.IsStopIncluded && other.IsStopIncluded;

            if (!this.Stop.isBefore(otherStop)) {
                isStopIncluded = isStopIncluded || !otherStop.equals(this.Stop) && other.IsStopIncluded;
                return new TimeInterval(this.Start, otherStop, isStartIncluded, isStopIncluded);
            }

            isStopIncluded = isStopIncluded || this.IsStopIncluded;
            return new TimeInterval(this.Start, this.Stop, isStartIncluded, isStopIncluded);
        }

        return TimeInterval.empty;
    };

    TimeInterval.prototype.contains = function(date) {
        if (this.IsEmpty)
            return false;

        var startComparedToDate = JulianDate.compare(this.Start, date);
        // if (start == date)
        if (startComparedToDate === 0)
            return this.IsStartIncluded;

        var dateComparedToStop = JulianDate.compare(date, this.Stop);
        // if (date == stop)
        if (dateComparedToStop === 0)
            return this.IsStopIncluded;

        // return start < date && date < stop
        return startComparedToDate < 0 && dateComparedToStop < 0;
    };

    TimeInterval.prototype.equals = function(other) {
        if (typeof other === 'undefined')
            return false;
        if (this.IsEmpty && other.IsEmpty)
            return true;
        return this._characteristics === other._characteristics && this.Start.equals(other.Start) && this.Stop.equals(other.Stop);
    };

    TimeInterval.prototype.equalsEpsilon = function(other, epsilon) {
        if (typeof other === 'undefined')
            return false;
        if (this.IsEmpty && other.IsEmpty)
            return true;
        return this._characteristics === other._characteristics && this.Start.equalsEpsilon(other.Start, epsilon) && this.Stop.equalsEpsilon(other.Stop, epsilon);
    };

    return TimeInterval;
});