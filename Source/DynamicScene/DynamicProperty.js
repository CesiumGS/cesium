/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Iso8601',
        '../Core/binarySearch',
        '../Core/HermitePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/LagrangePolynomialApproximation'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Iso8601,
        binarySearch,
        HermitePolynomialApproximation,
        LinearApproximation,
        LagrangePolynomialApproximation) {
    "use strict";

    var interpolators = {
            HERMITE : HermitePolynomialApproximation,
            LAGRANGE : LagrangePolynomialApproximation,
            LINEAR : LinearApproximation
        };

    function IntervalData() {
        this.interpolationAlgorithm = LinearApproximation;
        this.numberOfPoints = LinearApproximation.getRequiredDataPoints(1);
        this.interpolationDegree = 1;
        this.times = undefined;
        this.values = undefined;
        this.isSampled = false;
        this.xTable = undefined;
        this.yTable = undefined;
    }

    function czmlDateToJulianDate(date, epoch) {
        if (typeof date === 'string') {
            return JulianDate.fromIso601(date);
        }
        return epoch.addSeconds(date);
    }

    function DynamicProperty(valueType) {
        this.valueType = valueType;
        this._intervals = new TimeIntervalCollection();
        this._cachedDate = undefined;
        this._cachedInterval = undefined;
    }

    DynamicProperty.processCzmlPacket = function(parentObject, propertyName, valueType, czmlIntervals, constrainedInterval, dynamicObjectCollection) {
        var newProperty = false;
        var existingProperty = parentObject[propertyName];
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicProperty(valueType);
            parentObject[propertyName] = existingProperty;
            newProperty = true;
        }

        existingProperty.addIntervals(czmlIntervals, dynamicObjectCollection, constrainedInterval);

        return newProperty;
    };

    DynamicProperty._mergeNewSamples = function(epoch, times, values, newData, doublesPerValue, valueType) {
        var newDataIndex = 0, i, prevItem, timesInsertionPoint, valuesInsertionPoint, timesSpliceArgs, valuesSpliceArgs, currentTime, nextTime;
        while (newDataIndex < newData.length) {
            currentTime = czmlDateToJulianDate(newData[newDataIndex], epoch);
            timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);

            if (timesInsertionPoint < 0) {
                //Doesn't exist, insert as many additional values as we can.
                timesInsertionPoint = ~timesInsertionPoint;
                timesSpliceArgs = [timesInsertionPoint, 0];

                valuesInsertionPoint = timesInsertionPoint * doublesPerValue;
                valuesSpliceArgs = [valuesInsertionPoint, 0];
                prevItem = undefined;
                nextTime = times[timesInsertionPoint + 1];
                while (newDataIndex < newData.length) {
                    currentTime = czmlDateToJulianDate(newData[newDataIndex], epoch);

                    //CZML_TODO We can probably further optimize here by dealing with the special cases of ===,
                    //rather than bailing, though the case probably happens so infrequently, that not checking may be faster
                    if ((typeof prevItem !== 'undefined' && JulianDate.compare(prevItem, currentTime) >= 0) ||
                        (typeof nextTime !== 'undefined' && JulianDate.compare(currentTime, nextTime) >= 0)) {
                        break;
                    }
                    timesSpliceArgs.push(currentTime);
                    newDataIndex = newDataIndex + 1;
                    for (i = 0; i < doublesPerValue; i++) {
                        valuesSpliceArgs.push(newData[newDataIndex]);
                        newDataIndex = newDataIndex + 1;
                    }
                    prevItem = currentTime;
                }

                Array.prototype.splice.apply(values, valuesSpliceArgs);
                Array.prototype.splice.apply(times, timesSpliceArgs);
            } else {
                //Found an exact match
                for (i = 0; i < doublesPerValue; i++) {
                    newDataIndex++;
                    values[(timesInsertionPoint * doublesPerValue) + i] = newData[newDataIndex];
                }
                newDataIndex++;
            }
        }
    };

    DynamicProperty.prototype.addIntervals = function(czmlIntervals, dynamicObjectCollection, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], dynamicObjectCollection, constrainedInterval);
            }
        } else {
            this.addInterval(czmlIntervals, dynamicObjectCollection, constrainedInterval);
        }
    };

    DynamicProperty.prototype.addInterval = function(czmlInterval, dynamicObjectCollection, constrainedInterval) {
        var iso8601Interval = czmlInterval.interval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL;
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.intersect(constrainedInterval);
        }

        var unwrappedInterval = this.valueType.unwrapInterval(czmlInterval);
        this.addIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, czmlInterval, unwrappedInterval, dynamicObjectCollection);
    };

    DynamicProperty.prototype.addIntervalUnwrapped = function(start, stop, czmlInterval, unwrappedInterval, dynamicObjectCollection) {
        var thisIntervals = this._intervals;
        var existingInterval = thisIntervals.findInterval(start, stop);
        this._cachedDate = undefined;
        this._cachedInterval = undefined;

        var intervalData;
        if (typeof existingInterval === 'undefined') {
            intervalData = new IntervalData();
            existingInterval = new TimeInterval(start, stop, true, true, intervalData);
            thisIntervals.addInterval(existingInterval);
        } else {
            intervalData = existingInterval.data;
        }

        var thisValueType = this.valueType;
        if (thisValueType.isSampled(unwrappedInterval)) {
            var interpolationAlgorithm;
            var interpolationAlgorithmType = czmlInterval.interpolationAlgorithm;
            if (interpolationAlgorithmType) {
                interpolationAlgorithm = interpolators[interpolationAlgorithmType];
                intervalData.interpolationAlgorithm = interpolationAlgorithm;
            }
            var interpolationDegree = czmlInterval.interpolationDegree;
            if (interpolationAlgorithm && interpolationDegree) {
                intervalData.interpolationDegree = interpolationDegree;
                intervalData.xTable = undefined;
                intervalData.yTable = undefined;
            }

            if (!intervalData.isSampled) {
                intervalData.times = [];
                intervalData.values = [];
                intervalData.isSampled = true;
            }
            var epoch = czmlInterval.epoch;
            if (typeof epoch !== 'undefined') {
                epoch = JulianDate.fromIso8601(epoch);
            }
            DynamicProperty._mergeNewSamples(epoch, intervalData.times, intervalData.values, unwrappedInterval, thisValueType.doublesPerValue, thisValueType);
            intervalData.numberOfPoints = Math.min(intervalData.interpolationAlgorithm.getRequiredDataPoints(intervalData.interpolationDegree), intervalData.times.length);
        } else {
            //Packet itself is a constant value
            intervalData.times = undefined;
            intervalData.values = unwrappedInterval;
            intervalData.isSampled = false;
        }
    };

    DynamicProperty.prototype.getValue = function(time, existingInstance) {
        var interval = this._cachedInterval;
        var thisValueType = this.valueType;
        var doublesPerValue = thisValueType.doublesPerValue;

        if (this._cachedDate !== time) {
            this._cachedDate = time;
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._intervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
                if (typeof interval === 'undefined') {
                    return undefined;
                }
            }
        }

        var intervalData = interval.data;
        var times = intervalData.times;
        var values = intervalData.values;
        if (intervalData.isSampled && times.length >= 0 && values.length > 0) {
            var index = binarySearch(times, time, JulianDate.compare);

            if (index < 0) {
                index = ~index;

                if (index >= times.length) {
                    index = times.length - 1;
                }

                var firstIndex = 0;
                var lastIndex = times.length - 1;

                var degree = intervalData.numberOfPoints - 1;
                var pointsInCollection = lastIndex - firstIndex + 1;

                if (pointsInCollection < degree + 1) {
                    // Use the entire range.
                } else {
                    var computedFirstIndex = index - ((degree / 2) | 0) - 1;
                    if (computedFirstIndex < firstIndex) {
                        computedFirstIndex = firstIndex;
                    }
                    var computedLastIndex = computedFirstIndex + degree;
                    if (computedLastIndex > lastIndex) {
                        computedLastIndex = lastIndex;
                        computedFirstIndex = computedLastIndex - degree;
                        if (computedFirstIndex < firstIndex) {
                            computedFirstIndex = firstIndex;
                        }
                    }

                    firstIndex = computedFirstIndex;
                    lastIndex = computedLastIndex;
                }

                var length = lastIndex - firstIndex + 1;

                var doublesPerInterpolationValue = thisValueType.doublesPerInterpolationValue;
                var xTable = intervalData.xTable;
                var yTable = intervalData.yTable;

                if (typeof xTable === 'undefined') {
                    xTable = intervalData.xTable = new Array(intervalData.numberOfPoints);
                    yTable = intervalData.yTable = new Array(intervalData.numberOfPoints * doublesPerInterpolationValue);
                }

                // Build the tables
                for ( var i = 0; i < length; ++i) {
                    xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
                }
                var packFunction = thisValueType.packValuesForInterpolation;
                if (typeof packFunction !== 'undefined') {
                    packFunction(values, yTable, firstIndex, lastIndex);
                } else {
                    var destinationIndex = 0;
                    var sourceIndex = firstIndex * doublesPerValue;
                    var stop = (lastIndex + 1) * doublesPerValue;

                    while (sourceIndex < stop) {
                        yTable[destinationIndex] = values[sourceIndex];
                        sourceIndex++;
                        destinationIndex++;
                    }
                }

                // Interpolate!
                var x = times[lastIndex].getSecondsDifference(time);
                var result = intervalData.interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, doublesPerInterpolationValue);
                return thisValueType.getValueFromInterpolationResult(result, existingInstance, values, firstIndex, lastIndex);
            }
            return thisValueType.getValueFromArray(intervalData.values, index * doublesPerValue, existingInstance);
        }
        return thisValueType.getValue(intervalData.values, existingInstance);
    };

    return DynamicProperty;
});