/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/binarySearch',
        '../Core/LinearApproximation'
    ], function(
        defaultValue,
        DeveloperError,
        JulianDate,
        binarySearch,
        LinearApproximation) {
    "use strict";

    var interpolationScratch;

    //We can't use splice for inserting new elements because function apply can't handle
    //a huge number of arguments.  See https://code.google.com/p/chromium/issues/detail?id=56588
    function arrayInsert(array, startIndex, items) {
        var i;
        var arrayLength = array.length;
        var itemsLength = items.length;
        var newLength = arrayLength + itemsLength;

        array.length = newLength;
        if (arrayLength !== startIndex) {
            var q = arrayLength - 1;
            for (i = newLength - 1; i >= startIndex; i--) {
                array[i] = array[q--];
            }
        }

        for (i = 0; i < itemsLength; i++) {
            array[startIndex++] = items[i];
        }
    }

    //Converts a CZML defined data into a JulianDate, regardless of whether it was
    //specified in epoch seconds or as an ISO8601 string.
    function czmlDateToJulianDate(date, epoch) {
        if (typeof date === 'string') {
            return JulianDate.fromIso8601(date);
        }
        return epoch.addSeconds(date);
    }

    var _mergeNewSamples = function(epoch, times, values, newData, doublesPerValue) {
        var newDataIndex = 0;
        var i;
        var prevItem;
        var timesInsertionPoint;
        var valuesInsertionPoint;
        var timesSpliceArgs;
        var valuesSpliceArgs;
        var currentTime;
        var nextTime;

        while (newDataIndex < newData.length) {
            currentTime = czmlDateToJulianDate(newData[newDataIndex], epoch);
            timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);

            if (timesInsertionPoint < 0) {
                //Doesn't exist, insert as many additional values as we can.
                timesInsertionPoint = ~timesInsertionPoint;
                timesSpliceArgs = [];

                valuesInsertionPoint = timesInsertionPoint * doublesPerValue;
                valuesSpliceArgs = [];
                prevItem = undefined;
                nextTime = times[timesInsertionPoint];
                while (newDataIndex < newData.length) {
                    currentTime = czmlDateToJulianDate(newData[newDataIndex], epoch);
                    if ((typeof prevItem !== 'undefined' && JulianDate.compare(prevItem, currentTime) >= 0) || (typeof nextTime !== 'undefined' && JulianDate.compare(currentTime, nextTime) >= 0)) {
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

                arrayInsert(values, valuesInsertionPoint, valuesSpliceArgs);
                arrayInsert(times, timesInsertionPoint, timesSpliceArgs);
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

    /**
     * A {@link Property} whose value never changes.
     *
     * @alias SampledProperty
     * @constructor
     *
     * @exception {DeveloperError} value is required.
     */
    var SampledProperty = function(valueType) {
        this.interpolationAlgorithm = LinearApproximation;
        this.interpolationDegree = 1;
        this.numberOfPoints = LinearApproximation.getRequiredDataPoints(1);
        this.times = [];
        this.values = [];
        this.xTable = new Array(this.numberOfPoints);
        this.yTable = new Array(this.numberOfPoints * valueType.doublesPerInterpolationValue, 1);
        this.valueType = valueType;
    };

    /**
     * @memberof SampledProperty
     * @returns {Boolean} Always returns false, since this property never varies with simulation time.
     */
    SampledProperty.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Gets the value of the property, optionally cloning it.
     * @memberof SampledProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.  This parameter is unused.
     * @param {Object} [result] The object to store the value into if the value is clonable.  If the result is omitted or the value does not implement clone, the actual value is returned.
     * @returns The modified result parameter or the actual value instance if the value is not clonable.
     */
    SampledProperty.prototype.getValue = function(time, result) {
        var valueType = this.valueType;
        var times = this.times;
        var values = this.values;
        var doublesPerValue = valueType.doublesPerValue;
        var index = binarySearch(times, time, JulianDate.compare);
        if (index < 0) {
            if (this.numberOfPoints < 2) {
                return undefined;
            }
            index = ~index;

            if (index >= times.length) {
                index = times.length - 1;
            }

            var firstIndex = 0;
            var lastIndex = times.length - 1;

            var degree = this.numberOfPoints - 1;
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

            var doublesPerInterpolationValue = valueType.doublesPerInterpolationValue;
            var xTable = this.xTable;
            var yTable = this.yTable;

            if (typeof xTable === 'undefined') {
                xTable = this.xTable = new Array(this.numberOfPoints);
                yTable = this.yTable = new Array(this.numberOfPoints * doublesPerInterpolationValue);
            }

            // Build the tables
            for ( var i = 0; i < length; ++i) {
                xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
            }
            var specializedPackFunction = valueType.packValuesForInterpolation;
            if (typeof specializedPackFunction === 'undefined') {
                var destinationIndex = 0;
                var sourceIndex = firstIndex * doublesPerValue;
                var stop = (lastIndex + 1) * doublesPerValue;

                while (sourceIndex < stop) {
                    yTable[destinationIndex] = values[sourceIndex];
                    sourceIndex++;
                    destinationIndex++;
                }
            } else {
                specializedPackFunction(values, yTable, firstIndex, lastIndex);
            }

            // Interpolate!
            var x = times[lastIndex].getSecondsDifference(time);
            interpolationScratch = this.interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, doublesPerInterpolationValue, interpolationScratch);

            var specializedGetFunction = valueType.getValueFromInterpolationResult;
            if (typeof specializedGetFunction === 'undefined') {
                return valueType.getValueFromArray(interpolationScratch, 0, result);
            }
            return specializedGetFunction(interpolationScratch, result, values, firstIndex, lastIndex);
        }
        return valueType.getValueFromArray(this.values, index * doublesPerValue, result);
    };

    SampledProperty.prototype.sampleValue = function(start, stop, resultValues, resultTimes, requiredTimes, maximumStep) {
    };

    SampledProperty.prototype.addSample = function(time, value) {
    };

    SampledProperty.prototype.addSamples = function(times, values) {
    };

    SampledProperty.prototype.addSamplesFlatArray = function(data, epoch) {
        _mergeNewSamples(epoch, this.times, this.values, data, this.valueType.doublesPerValue);
    };

    return SampledProperty;
});