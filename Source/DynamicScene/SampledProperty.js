/*global define*/
define([
        '../Core/binarySearch',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/InterpolatableNumber',
        '../Core/JulianDate',
        '../Core/LinearApproximation'
       ], function(
        binarySearch,
        defaultValue,
        defined,
        DeveloperError,
        InterpolatableNumber,
        JulianDate,
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

    function convertDate(date, epoch) {
        if (date instanceof JulianDate) {
            return date;
        }
        if (typeof date === 'string') {
            return JulianDate.fromIso8601(date);
        }
        return epoch.addSeconds(date);
    }

    var _mergeNewSamples = function(epoch, times, values, newData, length) {
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
            currentTime = convertDate(newData[newDataIndex], epoch);
            timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);

            if (timesInsertionPoint < 0) {
                //Doesn't exist, insert as many additional values as we can.
                timesInsertionPoint = ~timesInsertionPoint;
                timesSpliceArgs = [];

                valuesInsertionPoint = timesInsertionPoint * length;
                valuesSpliceArgs = [];
                prevItem = undefined;
                nextTime = times[timesInsertionPoint];
                while (newDataIndex < newData.length) {
                    currentTime = convertDate(newData[newDataIndex], epoch);
                    if ((defined(prevItem) && JulianDate.compare(prevItem, currentTime) >= 0) || (defined(nextTime) && JulianDate.compare(currentTime, nextTime) >= 0)) {
                        break;
                    }
                    timesSpliceArgs.push(currentTime);
                    newDataIndex = newDataIndex + 1;
                    for (i = 0; i < length; i++) {
                        valuesSpliceArgs.push(newData[newDataIndex]);
                        newDataIndex = newDataIndex + 1;
                    }
                    prevItem = currentTime;
                }

                arrayInsert(values, valuesInsertionPoint, valuesSpliceArgs);
                arrayInsert(times, timesInsertionPoint, timesSpliceArgs);
            } else {
                //Found an exact match
                for (i = 0; i < length; i++) {
                    newDataIndex++;
                    values[(timesInsertionPoint * length) + i] = newData[newDataIndex];
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
    var SampledProperty = function(type) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        this.type = type;

        if (type === Number) {
            type = InterpolatableNumber;
        }

        this._innerType = type;
        this.interpolationAlgorithm = LinearApproximation;
        this.interpolationDegree = 1;
        this.numberOfPoints = LinearApproximation.getRequiredDataPoints(1);
        this._times = [];
        this._values = [];
        this._xTable = new Array(this.numberOfPoints);
        this._yTable = new Array(this.numberOfPoints * defaultValue(type.packedInterpolationLength, type.packedLength), 1);
    };

    /**
     * @memberof SampledProperty
     * @returns {Boolean} Always returns true, since this property always varies with simulation time.
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
     *
     * @exception {DeveloperError} time is required.
     */
    SampledProperty.prototype.getValue = function(time, result) {
        var innerType = this._innerType;
        var times = this._times;
        var values = this._values;
        var index = binarySearch(times, time, JulianDate.compare);
        if (index < 0) {
            if (times.length < this.numberOfPoints) {
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

            var interpolationLength = defaultValue(innerType.packedLength, innerType.packedInterpolationLength);
            var xTable = this._xTable;
            var yTable = this._yTable;

            if (!defined(xTable)) {
                xTable = this._xTable = new Array(this.numberOfPoints);
                yTable = this._yTable = new Array(this.numberOfPoints * interpolationLength);
            }

            // Build the tables
            for ( var i = 0; i < length; ++i) {
                xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
            }
            var specializedPackFunction = innerType.packForInterpolation;
            if (!defined(specializedPackFunction)) {
                var destinationIndex = 0;
                var sourceIndex = firstIndex * length;
                var stop = (lastIndex + 1) * length;

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
            interpolationScratch = this.interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, interpolationLength, interpolationScratch);

            if (!defined(innerType.unpackInterpolationResult)) {
                return innerType.unpack(interpolationScratch, 0, result);
            }
            return innerType.unpackInterpolationResult(interpolationScratch, result, values, firstIndex, lastIndex);
        }
        return innerType.unpack(this._values, index * innerType.packedLength, result);
    };

    SampledProperty.prototype.addSample = function(time, value) {
        var innerType = this._innerType;
        var data = [time];
        innerType.pack(data, 1, value);
        _mergeNewSamples(undefined, this._times, this._values, data, innerType.packedLength);
    };

    SampledProperty.prototype.addSamples = function(times, values) {
        var innerType = this._innerType;
        var length = times.length;
        var data = [];
        for ( var i = 0; i < length; i++) {
            data.push(times[i]);
            innerType.pack(data, data.length, values[i]);
        }
        _mergeNewSamples(undefined, this._times, this._values, data, innerType.packedLength);
    };

    SampledProperty.prototype.addSamplesFlatArray = function(data, epoch) {
        _mergeNewSamples(epoch, this._times, this._values, data, this._innerType.packedLength);
    };

    //Exposed for testing.
    SampledProperty._mergeNewSamples = _mergeNewSamples;

    return SampledProperty;
});