/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/binarySearch',
        '../Core/HermitePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/LagrangePolynomialApproximation'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
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


    function convertDate(date, epoch) {
        if (typeof date === 'string') {
            return JulianDate.fromIso601(date);
        }
        return epoch.addSeconds(date);
    }

    function DynamicProperty(dataHandler) {
        this.dataHandler = dataHandler;
        this._intervals = new TimeIntervalCollection();
        this._isSampled = false;
    }

    DynamicProperty.createOrUpdate = function(valueType, czmlIntervals, buffer, sourceUri, existingProperty, constrainedInterval) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicProperty(valueType);
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri, constrainedInterval);

        return existingProperty;
    };

    DynamicProperty._mergeNewSamples = function(epoch, times, values, newData, doublesPerValue, dataHandler) {
        var newDataIndex = 0, i, prevItem, timesInsertionPoint, valuesInsertionPoint, timesSpliceArgs, valuesSpliceArgs, currentTime, nextTime;
        while (newDataIndex < newData.length) {
            currentTime = convertDate(newData[newDataIndex], epoch);
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
                    currentTime = convertDate(newData[newDataIndex], epoch);

                    //TODO We can probably further optimize here by dealing with the special cases of ===,
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

    DynamicProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri, constrainedInterval);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri, constrainedInterval);
        }
    };

    DynamicProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri, constrainedInterval) {
        var iso8601Interval = czmlInterval.interval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = TimeInterval.INFINITE;
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.insersect(constrainedInterval);
        }

        var unwrappedInterval = this.dataHandler.unwrapCzmlInterval(czmlInterval);
        this.addIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, czmlInterval, unwrappedInterval, buffer, sourceUri);
    };

    DynamicProperty.prototype.addIntervalUnwrapped = function(start, stop, czmlInterval, unwrappedInterval, buffer, sourceUri) {
        var this_intervals = this._intervals;
        var existingInterval = this_intervals.findInterval(start, stop);

        var intervalData;
        if (typeof existingInterval === 'undefined') {
            intervalData = {
                interpolationAlgorithm : LinearApproximation,
                numberOfPoints : LinearApproximation.getRequiredDataPoints(1)
            };

            existingInterval = new TimeInterval(start, stop, true, true);
            existingInterval.data = intervalData;
            this_intervals.addInterval(existingInterval);
        } else {
            intervalData = existingInterval.data;
        }

        var this_dataHandler = this.dataHandler;
        if (this_dataHandler.isSampled(unwrappedInterval)) {
            var interpolationAlgorithm;
            var interpolationAlgorithmType = czmlInterval.interpolationAlgorithm;
            if (interpolationAlgorithmType) {
                interpolationAlgorithm = interpolators[interpolationAlgorithmType];
                intervalData.interpolationAlgorithm = interpolationAlgorithm;
            }
            var interpolationDegree = czmlInterval.interpolationDegree;
            if (interpolationAlgorithm && interpolationDegree) {
                intervalData.interpolationDegree = interpolationDegree;
                intervalData.numberOfPoints = interpolationAlgorithm.getRequiredDataPoints(interpolationDegree, 0);
                intervalData.xTable = undefined;
                intervalData.yTable = undefined;
            }

            if (!this._isSampled) {
                intervalData.times = [];
                intervalData.values = [];
                this._isSampled = true;
            }
            var epoch = czmlInterval.epoch;
            if (typeof epoch !== 'undefined') {
                epoch = JulianDate.fromIso8601(epoch);
            }
            DynamicProperty._mergeNewSamples(epoch, intervalData.times, intervalData.values, unwrappedInterval, this_dataHandler.doublesPerValue, this_dataHandler);
        } else {
            //Packet itself is a constant value
            intervalData.times = undefined;
            intervalData.values = this_dataHandler.createValue(unwrappedInterval);
            this._isSampled = false;
        }
    };

    DynamicProperty.prototype.getValue = function(time) {
        var this_dataHandler = this.dataHandler;
        var interval = this._intervals.findIntervalContainingDate(time);

        if (typeof interval !== 'undefined') {
            var intervalData = interval.data;
            var times = intervalData.times;
            var values = intervalData.values;
            if (this._isSampled && times.length >= 0 && values.length > 0) {
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

                    var doublesPerInterpolationValue = this_dataHandler.doublesPerInterpolationValue, xTable = intervalData.xTable, yTable = intervalData.yTable;

                    if (typeof xTable === 'undefined') {
                        xTable = intervalData.xTable = new Array(intervalData.numberOfPoints);
                        yTable = intervalData.yTable = new Array(intervalData.numberOfPoints * doublesPerInterpolationValue);
                    }

                    // Build the tables
                    for ( var i = 0; i < length; ++i) {
                        xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
                    }
                    this_dataHandler.packValuesForInterpolation(values, yTable, firstIndex, lastIndex);

                    // Interpolate!
                    var x = times[lastIndex].getSecondsDifference(time);
                    var interpolationFunction = intervalData.interpolationAlgorithm.interpolateOrderZero;
                    var result = interpolationFunction(x, xTable, yTable, doublesPerInterpolationValue);

                    return this_dataHandler.createValueFromInterpolationResult(result, values, firstIndex, lastIndex);
                }
                return this_dataHandler.createValueFromArray(intervalData.values, index * this_dataHandler.doublesPerValue);
            }
            return intervalData.values;
        }
        return undefined;
    };

    return DynamicProperty;
});