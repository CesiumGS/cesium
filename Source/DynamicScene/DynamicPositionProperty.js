/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/Matrix3',
        '../Core/ReferenceFrame',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Transforms',
        './CzmlPosition',
        './DynamicProperty'
    ], function(
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        Iso8601,
        JulianDate,
        Matrix3,
        ReferenceFrame,
        TimeInterval,
        TimeIntervalCollection,
        Transforms,
        CzmlPosition,
        DynamicProperty) {
    "use strict";

    var scratchMatrix3 = new Matrix3();
    var wgs84 = Ellipsoid.WGS84;

    /**
     * A dynamic property which stores both Cartesian and Cartographic data
     * and can convert and return the desired type of data for a desired time.
     * Rather than creating instances of this object directly, it's typically
     * created and managed via loading CZML data into a DynamicObjectCollection.
     * Instances of this type are exposed via DynamicObject and it's sub-objects
     * and are responsible for interpreting and interpolating the data for visualization.
     *
     * @alias DynamicPositionProperty
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicMaterialProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     */
    var DynamicPositionProperty = function() {
        this._dynamicProperties = [];
        this._propertyIntervals = new TimeIntervalCollection();
        this._cachedTime = undefined;
        this._cachedInterval = undefined;
    };

    /**
     * Processes the provided CZML interval or intervals into this property.
     *
     * @memberof DynamicPositionProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     */
    DynamicPositionProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], constrainedInterval);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, constrainedInterval);
        }
    };

    /**
     * Retrieves the value of the object at the supplied time as a Cartographic.
     * @memberof DynamicPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartographic} [result] The object to store the result onto, if undefined a new instance will be created.
     * @returns The modified result property, or a new instance if result was undefined.
     */
    DynamicPositionProperty.prototype.getValueCartographic = function(time, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        var interval = this._cachedInterval;
        if (!JulianDate.equals(this._cachedTime, time)) {
            this._cachedTime = JulianDate.clone(time, this._cachedTime);
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._propertyIntervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        result = interval.cachedValue = property.getValue(time, interval.cachedValue);
        if (typeof result !== 'undefined') {
            if (interval.data.referenceFrame === ReferenceFrame.INERTIAL) {
                var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchMatrix3);
                if (typeof icrfToFixed === 'undefined') {
                    return undefined;
                }
                result = icrfToFixed.multiplyByVector(result, result);
            }
            result = wgs84.cartesianToCartographic(result);
        }
        return result;
    };

    /**
     * Retrieves the value of the object at the supplied time as a Cartesian3.
     * @memberof DynamicPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the result onto, if undefined a new instance will be created.
     * @returns The modified result property, or a new instance if result was undefined.
     */
    DynamicPositionProperty.prototype.getValueCartesian = function(time, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        var interval = this._cachedInterval;
        if (!JulianDate.equals(this._cachedTime, time)) {
            this._cachedTime = JulianDate.clone(time, this._cachedTime);
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._propertyIntervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        result = property.getValue(time, result);
        if (interval.data.referenceFrame === ReferenceFrame.INERTIAL) {
            var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchMatrix3);
            if (typeof icrfToFixed === 'undefined') {
                return undefined;
            }
            return icrfToFixed.multiplyByVector(result, result);
        }
        return result;
    };

    /**
     * Retrieves all values in the provided time range.  Rather than sampling, this
     * method returns the actual data points used in the source data, with the exception
     * of start, stop and currentTime parameters, which will be sampled.
     *
     * @param {JulianDate} start The first time to retrieve values for.
     * @param {JulianDate} stop The last time to retrieve values for .
     * @param {JulianDate} [currentTime] If provided, causes the algorithm to always sample the provided time, assuming it is between start and stop.
     * @param {Array} [result] The array into which to store the result.
     * @returns The modified result array or a new instance if one was not provided.
     */
    DynamicPositionProperty.prototype.getValueRangeCartesian = function(start, stop, currentTime, result) {
        if (typeof start === 'undefined') {
            throw new DeveloperError('start is required');
        }

        if (typeof stop === 'undefined') {
            throw new DeveloperError('stop is required');
        }

        if (typeof result === 'undefined') {
            result = [];
        }

        var propertyIntervals = this._propertyIntervals;

        var startIndex = typeof start === 'undefined' ? 0 : propertyIntervals.indexOf(start);
        var stopIndex = typeof stop === 'undefined' ? propertyIntervals.length - 1 : propertyIntervals.indexOf(stop);
        if (startIndex < 0) {
            startIndex = ~startIndex;
        }

        if (startIndex === propertyIntervals.getLength()) {
            result.length = 0;
            return result;
        }

        if (stopIndex < 0) {
            stopIndex = ~stopIndex;
            if (stopIndex !== propertyIntervals.getLength()) {
                result.length = 0;
                return result;
            }
            stopIndex -= 1;
        }

        var r = 0;
        //Always step exactly on start (but only use it if it exists.)
        var tmp;
        tmp = this.getValueCartesian(start, result[r]);
        if (typeof tmp !== 'undefined') {
            result[r++] = tmp;
        }

        var steppedOnNow = typeof currentTime === 'undefined' || currentTime.lessThan(start) || currentTime.greaterThan(stop);
        for ( var i = startIndex; i < stopIndex + 1; i++) {
            var current;
            var interval = propertyIntervals.get(i);
            var nextInterval = propertyIntervals.get(i + 1);
            var loopStop = stop;
            if (typeof nextInterval !== 'undefined' && stop.greaterThan(nextInterval.start)) {
                loopStop = nextInterval.start;
            }
            var property = interval.data;
            var currentInterval = property._intervals.get(0);
            var times = currentInterval.data.times;
            if (typeof times !== 'undefined') {
                //Iterate over all interval times and add the ones that fall in our
                //time range.  Note that times can contain data outside of
                //the intervals range.  This is by design for use with interpolation.
                var t;
                for (t = 0; t < times.length; t++) {
                    current = times[t];
                    if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                        tmp = property.getValue(currentTime, result[r]);
                        if (typeof tmp !== 'undefined') {
                            result[r++] = tmp;
                        }
                        steppedOnNow = true;
                    }
                    if (current.greaterThan(start) && current.lessThan(loopStop)) {
                        tmp = property.getValue(current, result[r]);
                        if (typeof tmp !== 'undefined') {
                            result[r++] = tmp;
                        }
                    }
                }
            } else {
                //If times is undefined, it's because the interval contains a single position
                //at which it stays for the duration of the interval.
                current = interval.start;

                //We don't need to actually step on now in this case, since the next value
                //will be the same; but we do still need to check for it.
                steppedOnNow = steppedOnNow || current.greaterThanOrEquals(currentTime);

                //Finally, get the value at this non-sampled interval.
                if (current.lessThan(loopStop)) {
                    tmp = property.getValue(current, result[r]);
                    if (typeof tmp !== 'undefined') {
                        result[r++] = tmp;
                    }
                }
            }
        }

        //Always step exactly on stop (but only use it if it exists.)
        tmp = this.getValueCartesian(stop, result[r]);
        if (typeof tmp !== 'undefined') {
            result[r++] = tmp;
        }

        result.length = r;
        return result;
    };

    DynamicPositionProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval) {
        this._cachedTime = undefined;
        this._cachedInterval = undefined;

        var iso8601Interval = czmlInterval.interval, property, unwrappedInterval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.intersect(constrainedInterval);
        }

        //See if we already have data at that interval.
        var thisIntervals = this._propertyIntervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        if (typeof existingInterval !== 'undefined') {
            //If so, see if the new data is the same type.
            property = existingInterval.data;
            if (typeof property !== 'undefined') {
                unwrappedInterval = CzmlPosition.unwrapInterval(czmlInterval);
            }
        } else {
            //If not, create it.
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        if (typeof unwrappedInterval === 'undefined') {
            unwrappedInterval = CzmlPosition.unwrapInterval(czmlInterval);
            if (typeof unwrappedInterval !== 'undefined') {
                property = new DynamicProperty(CzmlPosition);
                this._dynamicProperties.push(property);
                existingInterval.data = property;
                property.referenceFrame = ReferenceFrame.FIXED;
            }
        }

        //We could handle the data, add it to the property.
        if (typeof unwrappedInterval !== 'undefined') {
            if (typeof czmlInterval.referenceFrame !== 'undefined') {
                existingInterval.data.referenceFrame = ReferenceFrame[czmlInterval.referenceFrame];
            }
            property._addCzmlIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, unwrappedInterval, czmlInterval.epoch, czmlInterval.interpolationAlgorithm, czmlInterval.interpolationDegree);
        }
    };

    DynamicPositionProperty.prototype._getReferenceFrame = function() {
        var propertyIntervals = this._propertyIntervals;
        if (propertyIntervals.getLength() > 0) {
            return propertyIntervals.get(0).data.referenceFrame;
        }
        return undefined;
    };

    DynamicPositionProperty.prototype._getValueInReferenceFrame = function(time, referenceFrame, result) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        var interval = this._cachedInterval;
        if (!JulianDate.equals(this._cachedTime, time)) {
            this._cachedTime = JulianDate.clone(time, this._cachedTime);
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._propertyIntervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        result = property.getValue(time, result);

        if (interval.data.referenceFrame !== referenceFrame) {
            if (referenceFrame === ReferenceFrame.FIXED) {
                var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchMatrix3);
                if (typeof icrfToFixed === 'undefined') {
                    return undefined;
                }
                return icrfToFixed.multiplyByVector(result, result);
            }
            if (referenceFrame === ReferenceFrame.INERTIAL) {
                var fixedToIcrf = Transforms.computeFixedToIcrfMatrix(time, scratchMatrix3);
                if (typeof fixedToIcrf === 'undefined') {
                    return undefined;
                }
                return fixedToIcrf.multiplyByVector(result, result);
            }
        }
        return result;
    };

    DynamicPositionProperty.prototype._getValueRangeInReferenceFrame = function(start, stop, currentTime, referenceFrame, maximumStep, result) {
        if (typeof start === 'undefined') {
            throw new DeveloperError('start is required');
        }

        if (typeof stop === 'undefined') {
            throw new DeveloperError('stop is required');
        }

        if (typeof result === 'undefined') {
            result = [];
        }

        var propertyIntervals = this._propertyIntervals;

        var startIndex = typeof start === 'undefined' ? 0 : propertyIntervals.indexOf(start);
        var stopIndex = typeof stop === 'undefined' ? propertyIntervals.length - 1 : propertyIntervals.indexOf(stop);
        if (startIndex < 0) {
            startIndex = ~startIndex;
        }

        if (startIndex === propertyIntervals.getLength()) {
            result.length = 0;
            return result;
        }

        if (stopIndex < 0) {
            stopIndex = ~stopIndex;
            if (stopIndex !== propertyIntervals.getLength()) {
                result.length = 0;
                return result;
            }
            stopIndex -= 1;
        }

        var r = 0;
        //Always step exactly on start (but only use it if it exists.)
        var tmp;
        tmp = this._getValueInReferenceFrame(start, referenceFrame, result[r]);
        if (typeof tmp !== 'undefined') {
            result[r++] = tmp;
        }

        var steppedOnNow = typeof currentTime === 'undefined' || currentTime.lessThan(start) || currentTime.greaterThan(stop);
        for ( var i = startIndex; i < stopIndex + 1; i++) {
            var current;
            var interval = propertyIntervals.get(i);
            var nextInterval = propertyIntervals.get(i + 1);
            var loopStop = stop;
            if (typeof nextInterval !== 'undefined' && stop.greaterThan(nextInterval.start)) {
                loopStop = nextInterval.start;
            }

            var sampling = false;
            var sampleStepsToTake;
            var sampleStepsTaken;
            var sampleStepSize;

            var property = interval.data;
            var currentInterval = property._intervals.get(0);
            var times = currentInterval.data.times;
            if (typeof times !== 'undefined') {
                //Iterate over all interval times and add the ones that fall in our
                //time range.  Note that times can contain data outside of
                //the intervals range.  This is by design for use with interpolation.
                var t = 0;
                var len = times.length;
                current = times[t];
                while(t < len) {
                    if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                        tmp = this._getValueInReferenceFrame(currentTime, referenceFrame, result[r]);
                        if (typeof tmp !== 'undefined') {
                            result[r++] = tmp;
                        }
                        steppedOnNow = true;
                    }
                    if (current.greaterThan(start) && current.lessThan(loopStop)) {
                        tmp = this._getValueInReferenceFrame(current, referenceFrame, result[r]);
                        if (typeof tmp !== 'undefined') {
                            result[r++] = tmp;
                        }
                    }

                    if (t < (len - 1)) {
                        if (!sampling) {
                            var next = times[t + 1];
                            var secondsUntilNext = current.getSecondsDifference(next);
                            sampling = secondsUntilNext > maximumStep;

                            if (sampling) {
                                sampleStepsToTake = Math.floor(secondsUntilNext / maximumStep);
                                sampleStepsTaken = 0;
                                sampleStepSize = secondsUntilNext / Math.max(sampleStepsToTake, 2);
                                sampleStepsToTake = Math.max(sampleStepsToTake - 2, 1);
                            }
                        }

                        if (sampling && sampleStepsTaken < sampleStepsToTake) {
                            current = current.addSeconds(sampleStepSize);
                            sampleStepsTaken++;
                            continue;
                        }
                    }
                    sampling = false;
                    t++;
                    current = times[t];
                }
            } else {
                //If times is undefined, it's because the interval contains a single position
                //at which it stays for the duration of the interval.
                current = interval.start;

                //We don't need to actually step on now in this case, since the next value
                //will be the same; but we do still need to check for it.
                steppedOnNow = steppedOnNow || current.greaterThanOrEquals(currentTime);

                //Finally, get the value at this non-sampled interval.
                if (current.lessThan(loopStop)) {
                    tmp = this._getValueInReferenceFrame(current, referenceFrame, result[r]);
                    if (typeof tmp !== 'undefined') {
                        result[r++] = tmp;
                    }
                }
            }
        }

        //Always step exactly on stop (but only use it if it exists.)
        tmp = this._getValueInReferenceFrame(stop, referenceFrame, result[r]);
        if (typeof tmp !== 'undefined') {
            result[r++] = tmp;
        }

        result.length = r;
        return result;
    };

    return DynamicPositionProperty;
});