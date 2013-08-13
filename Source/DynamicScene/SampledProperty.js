/*global define*/
define([
        '../Core/binarySearch',
        '../Core/defaultValue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/LinearApproximation',
        '../Core/Quaternion'
       ], function(
        binarySearch,
        defaultValue,
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        DeveloperError,
        JulianDate,
        LinearApproximation,
        Quaternion) {
    "use strict";

    var interpolationScratch;

    var SampledCartesian2 = {
        doublesPerValue : 2,
        doublesPerInterpolationValue : 2,
        flatten : function(array, value) {
            array.push(value.x);
            array.push(value.y);
        },
        inflate : function(array, startingIndex, result) {
            if (!defined(result)) {
                result = new Cartesian2();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            return result;
        }
    };

    var SampledCartesian3 = {
        doublesPerValue : 3,
        doublesPerInterpolationValue : 3,
        flatten : function(array, value) {
            array.push(value.x);
            array.push(value.y);
            array.push(value.z);
        },
        inflate : function(array, startingIndex, result) {
            if (!defined(result)) {
                result = new Cartesian3();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            return result;
        }
    };

    var SampledColor = {
        doublesPerValue : 4,
        doublesPerInterpolationValue : 4,
        flatten : function(array, startingIndex, result) {
            if (!defined(result)) {
                result = new Color();
            }
            result.red = array[startingIndex];
            result.green = array[startingIndex + 1];
            result.blue = array[startingIndex + 2];
            result.alpha = array[startingIndex + 3];
            return result;
        },
        inflate : function(array, startingIndex, result) {
            if (!defined(result)) {
                result = new Color();
            }
            result.red = array[startingIndex];
            result.green = array[startingIndex + 1];
            result.blue = array[startingIndex + 2];
            result.alpha = array[startingIndex + 3];
            return result;
        }
    };

    var SampledNumber = {
        doublesPerValue : 1,
        doublesPerInterpolationValue : 1,
        flatten : function(array, value) {
            array.push(value);
        },
        inflate : function(array, startingIndex) {
            return array[startingIndex];
        }
    };

    var sampledQuaternionAxis = new Cartesian3();
    var sampledQuaternionRotation = new Cartesian3();
    var sampledQuaternionTempQuaternion = new Quaternion();
    var sampledQuaternionQuaternion0 = new Quaternion();
    var sampledQuaternionQuaternion0Conjugate = new Quaternion();

    var SampledQuaternion = {
        doublesPerValue : 4,
        doublesPerInterpolationValue : 3,
        packValuesForInterpolation : function(sourceArray, destinationArray, firstIndex, lastIndex) {
            SampledQuaternion.inflate(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0Conjugate);
            sampledQuaternionQuaternion0Conjugate.conjugate(sampledQuaternionQuaternion0Conjugate);

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * 3;
                SampledQuaternion.inflate(sourceArray, (firstIndex + i) * 4, sampledQuaternionTempQuaternion);

                sampledQuaternionTempQuaternion.multiply(sampledQuaternionQuaternion0Conjugate, sampledQuaternionTempQuaternion);

                if (sampledQuaternionTempQuaternion.w < 0) {
                    sampledQuaternionTempQuaternion.negate(sampledQuaternionTempQuaternion);
                }

                sampledQuaternionTempQuaternion.getAxis(sampledQuaternionAxis);
                var angle = sampledQuaternionTempQuaternion.getAngle();
                destinationArray[offset] = sampledQuaternionAxis.x * angle;
                destinationArray[offset + 1] = sampledQuaternionAxis.y * angle;
                destinationArray[offset + 2] = sampledQuaternionAxis.z * angle;
            }
        },
        inflate : function(array, startingIndex, result) {
            if (!defined(result)) {
                result = new Quaternion();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            result.w = array[startingIndex + 3];
            return result;
        },
        inflateInterpolationResult : function(array, result, sourceArray, firstIndex, lastIndex) {
            if (!defined(result)) {
                result = new Quaternion();
            }
            sampledQuaternionRotation.x = array[0];
            sampledQuaternionRotation.y = array[1];
            sampledQuaternionRotation.z = array[2];
            var magnitude = sampledQuaternionRotation.magnitude();

            SampledQuaternion.inflate(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0);

            if (magnitude === 0) {
                //Can't just use Quaternion.IDENTITY here because sampledQuaternionTempQuaternion may be modified in the future.
                sampledQuaternionTempQuaternion.x = sampledQuaternionTempQuaternion.y = sampledQuaternionTempQuaternion.z = 0.0;
                sampledQuaternionTempQuaternion.w = 1.0;
            } else {
                Quaternion.fromAxisAngle(sampledQuaternionRotation, magnitude, sampledQuaternionTempQuaternion);
            }

            return sampledQuaternionTempQuaternion.multiply(sampledQuaternionQuaternion0, result);
        }
    };

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
            currentTime = convertDate(newData[newDataIndex], epoch);
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
                    currentTime = convertDate(newData[newDataIndex], epoch);
                    if ((defined(prevItem) && JulianDate.compare(prevItem, currentTime) >= 0) || (defined(nextTime) && JulianDate.compare(currentTime, nextTime) >= 0)) {
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
    var SampledProperty = function(type) {
        var typeHandler;
        if (!defined(type)) {
            typeHandler = SampledNumber;
        } else if (type === Cartesian2) {
            typeHandler = SampledCartesian2;
        } else if (type === Cartesian3) {
            typeHandler = SampledCartesian3;
        } else if (type === Color) {
            typeHandler = SampledColor;
        } else if (type === Quaternion) {
            typeHandler = SampledQuaternion;
        } else {
            throw new DeveloperError('unknown type');
        }

        this.type = type;
        this._typeHandler = typeHandler;
        this.interpolationAlgorithm = LinearApproximation;
        this.interpolationDegree = 1;
        this.numberOfPoints = LinearApproximation.getRequiredDataPoints(1);
        this._times = [];
        this._values = [];
        this._xTable = new Array(this.numberOfPoints);
        this._yTable = new Array(this.numberOfPoints * typeHandler.doublesPerInterpolationValue, 1);
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
        var typeHandler = this._typeHandler;
        var times = this._times;
        var values = this._values;
        var doublesPerValue = typeHandler.doublesPerValue;
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

            var doublesPerInterpolationValue = typeHandler.doublesPerInterpolationValue;
            var xTable = this._xTable;
            var yTable = this._yTable;

            if (!defined(xTable)) {
                xTable = this._xTable = new Array(this.numberOfPoints);
                yTable = this._yTable = new Array(this.numberOfPoints * doublesPerInterpolationValue);
            }

            // Build the tables
            for ( var i = 0; i < length; ++i) {
                xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
            }
            var specializedPackFunction = typeHandler.packValuesForInterpolation;
            if (!defined(specializedPackFunction)) {
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

            if (!defined(typeHandler.inflateInterpolationResult)) {
                return typeHandler.inflate(interpolationScratch, 0, result);
            }
            return typeHandler.inflateInterpolationResult(interpolationScratch, result, values, firstIndex, lastIndex);
        }
        return typeHandler.inflate(this._values, index * doublesPerValue, result);
    };

    SampledProperty.prototype.addSample = function(time, value) {
        var typeHandler = this._typeHandler;
        var data = [time];
        typeHandler.flatten(data, value);
        _mergeNewSamples(undefined, this._times, this._values, data, typeHandler.doublesPerValue);
    };

    SampledProperty.prototype.addSamples = function(times, values) {
        var typeHandler = this._typeHandler;
        var length = times.length;
        var data = [];
        for ( var i = 0; i < length; i++) {
            data.push(times[i]);
            typeHandler.flatten(data, values[i]);
        }
        _mergeNewSamples(undefined, this._times, this._values, data, typeHandler.doublesPerValue);
    };

    SampledProperty.prototype.addSamplesFlatArray = function(data, epoch) {
        _mergeNewSamples(epoch, this._times, this._values, data, this._typeHandler.doublesPerValue);
    };

    //Exposed for testing.
    SampledProperty._mergeNewSamples = _mergeNewSamples;

    return SampledProperty;
});