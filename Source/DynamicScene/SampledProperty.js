/*global define*/
define([
        '../Core/binarySearch',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/LinearApproximation'
       ], function(
        binarySearch,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        JulianDate,
        LinearApproximation) {
    "use strict";

    var PackableNumber = {
        packedLength : 1,
        pack : function(value, array, startingIndex) {
            startingIndex = defaultValue(startingIndex, 0);
            array[startingIndex] = value;
        },
        unpack : function(array, startingIndex, result) {
            startingIndex = defaultValue(startingIndex, 0);
            return array[startingIndex];
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

    var timesSpliceArgs = [];
    var valuesSpliceArgs = [];

    var mergeNewSamples = function(epoch, times, values, newData, packedLength) {
        var newDataIndex = 0;
        var i;
        var prevItem;
        var timesInsertionPoint;
        var valuesInsertionPoint;
        var currentTime;
        var nextTime;

        while (newDataIndex < newData.length) {
            currentTime = convertDate(newData[newDataIndex], epoch);
            timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);
            var timesSpliceArgsCount = 0;
            var valuesSpliceArgsCount = 0;

            if (timesInsertionPoint < 0) {
                //Doesn't exist, insert as many additional values as we can.
                timesInsertionPoint = ~timesInsertionPoint;

                valuesInsertionPoint = timesInsertionPoint * packedLength;
                prevItem = undefined;
                nextTime = times[timesInsertionPoint];
                while (newDataIndex < newData.length) {
                    currentTime = convertDate(newData[newDataIndex], epoch);
                    if ((defined(prevItem) && JulianDate.compare(prevItem, currentTime) >= 0) || (defined(nextTime) && JulianDate.compare(currentTime, nextTime) >= 0)) {
                        break;
                    }
                    timesSpliceArgs[timesSpliceArgsCount++] = currentTime;
                    newDataIndex = newDataIndex + 1;
                    for (i = 0; i < packedLength; i++) {
                        valuesSpliceArgs[valuesSpliceArgsCount++] = newData[newDataIndex];
                        newDataIndex = newDataIndex + 1;
                    }
                    prevItem = currentTime;
                }

                if (timesSpliceArgsCount > 0) {
                    valuesSpliceArgs.length = valuesSpliceArgsCount;
                    arrayInsert(values, valuesInsertionPoint, valuesSpliceArgs);

                    timesSpliceArgs.length = timesSpliceArgsCount;
                    arrayInsert(times, timesInsertionPoint, timesSpliceArgs);
                }
            } else {
                //Found an exact match
                for (i = 0; i < packedLength; i++) {
                    newDataIndex++;
                    values[(timesInsertionPoint * packedLength) + i] = newData[newDataIndex];
                }
                newDataIndex++;
            }
        }
    };

    /**
     * A {@link Property} whose value is interpolated for a given time from the
     * provided set of samples and specified interpolation algorithm and degree.
     * @alias SampledProperty
     * @constructor
     *
     * @param {Object} type The type of property, which must be Number, String or implement {@link Packable}.
     *
     * @see SampledPositionProperty
     *
     * @example
     * //Create a linearly interpolated Cartesian2
     * var property = new Cesium.SampledProperty(Cesium.Cartesian2);
     * property.interpolationDegree = 1;
     * property.interpolationAlgorithm = LinearApproximation;
     *
     * //Populate it with data
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:00:00.00Z`), new Cesium.Cartesian2(0, 0));
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-02T00:00:00.00Z`), new Cesium.Cartesian2(4, 7));
     *
     * //Retrieve an interpolated value
     * var result = property.getValue(Cesium.JulianDate.fromIso8601(`2012-08-01T12:00:00.00Z`));
     *
     * @example
     * //Create a simple numeric SampledProperty that uses third degree Hermite Polynomial Approximation
     * var property = new Cesium.SampledProperty(Number);
     * property.interpolationDegree = 3;
     * property.interpolationAlgorithm = Cesium.HermitePolynomialApproximation;
     *
     * //Populate it with data
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:00:00.00Z`), 1.0);
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:01:00.00Z`), 6.0);
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:02:00.00Z`), 12.0);
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:03:30.00Z`), 5.0);
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:06:30.00Z`), 2.0);
     *
     * //Samples can be added in any order.
     * property.addSample(Cesium.JulianDate.fromIso8601(`2012-08-01T00:00:30.00Z`), 6.2);
     *
     * //Retrieve an interpolated value
     * var result = property.getValue(Cesium.JulianDate.fromIso8601(`2012-08-01T00:02:34.00Z`));
     */
    var SampledProperty = function(type) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        var innerType = type;
        if (innerType === Number) {
            innerType = PackableNumber;
        }
        var packedInterpolationLength = defaultValue(innerType.packedInterpolationLength, innerType.packedLength);

        this._type = type;
        this._innerType = innerType;
        this._interpolationDegree = 1;
        this._interpolationAlgorithm = LinearApproximation;
        this._numberOfPoints = 0;
        this._times = [];
        this._values = [];
        this._xTable = [];
        this._yTable = [];
        this._packedInterpolationLength = packedInterpolationLength;
        this._updateTableLength = true;
        this._interpolationResult = new Array(packedInterpolationLength);
    };

    defineProperties(SampledProperty.prototype, {
        /**
         * Gets the type of property.
         * @memberof SampledProperty.prototype
         * @type {Object}
         */
        type : {
            get : function() {
                return this._type;
            }
        },
        /**
         * Gets or sets the degree of interpolation to perform when retrieving a value.
         * @memberof SampledProperty.prototype
         * @type {Object}
         * @default 1
         */
        interpolationDegree : {
            get : function() {
                return this._interpolationDegree;
            },
            set : function(value) {
                this._interpolationDegree = value;
                this._updateTableLength = true;
            }
        },
        /**
         * Gets or sets the interpolation algorithm to use when retrieving a value.
         * @memberof SampledProperty.prototype
         * @type {InterpolationAlgorithm}
         * @default LinearApproximation
         */
        interpolationAlgorithm : {
            get : function() {
                return this._interpolationAlgorithm;
            },
            set : function(value) {
                this._interpolationAlgorithm = value;
                this._updateTableLength = true;
            }
        }
    });

    /**
     * Gets the value of the property at the provided time.
     * @memberof SampledProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    SampledProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var innerType = this._innerType;
        var times = this._times;
        var values = this._values;
        var index = binarySearch(times, time, JulianDate.compare);
        if (index < 0) {
            var xTable = this._xTable;
            var yTable = this._yTable;
            var interpolationAlgorithm = this._interpolationAlgorithm;
            var packedInterpolationLength = this._packedInterpolationLength;

            if (this._updateTableLength) {
                this._updateTableLength = false;
                var numberOfPoints = Math.min(interpolationAlgorithm.getRequiredDataPoints(this._interpolationDegree), times.length);
                if (numberOfPoints !== this._numberOfPoints) {
                    this._numberOfPoints = numberOfPoints;
                    xTable.length = numberOfPoints;
                    yTable.length = numberOfPoints * packedInterpolationLength;
                }
            }

            var degree = this._numberOfPoints - 1;
            if (degree < 1) {
                return undefined;
            }
            index = ~index;

            if (index >= times.length) {
                index = times.length - 1;
            }

            var firstIndex = 0;
            var lastIndex = times.length - 1;
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

            // Build the tables
            for ( var i = 0; i < length; ++i) {
                xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
            }

            if (!defined(innerType.convertPackedArrayForInterpolation)) {
                var destinationIndex = 0;
                var packedLength = innerType.packedLength;
                var sourceIndex = firstIndex * packedLength;
                var stop = (lastIndex + 1) * packedLength;

                while (sourceIndex < stop) {
                    yTable[destinationIndex] = values[sourceIndex];
                    sourceIndex++;
                    destinationIndex++;
                }
            } else {
                innerType.convertPackedArrayForInterpolation(values, firstIndex, lastIndex, yTable);
            }

            // Interpolate!
            var x = times[lastIndex].getSecondsDifference(time);
            var interpolationResult = interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, packedInterpolationLength, this._interpolationResult);

            if (!defined(innerType.unpackInterpolationResult)) {
                return innerType.unpack(interpolationResult, 0, result);
            }
            return innerType.unpackInterpolationResult(interpolationResult, values, firstIndex, lastIndex, result);
        }
        return innerType.unpack(this._values, index * innerType.packedLength, result);
    };

    /**
     * Adds a new sample
     * @memberof SampledProperty
     *
     * @param {JulianDate} time The sample time.
     * @param {Object} value The value at the provided time.
     */
    SampledProperty.prototype.addSample = function(time, value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var innerType = this._innerType;
        var data = [time];
        innerType.pack(value, data, 1);
        mergeNewSamples(undefined, this._times, this._values, data, innerType.packedLength);
        this._updateTableLength = true;
    };

    /**
     * Adds an array of samples
     * @memberof SampledProperty
     *
     * @param {Array} times An array of JulianDate instances where each index is a sample time.
     * @param {Array} values The array of values, where each value corresponds to the provided times index.
     *
     * @exception {DeveloperError} times and values must be the same length..
     */
    SampledProperty.prototype.addSamples = function(times, values) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(times)) {
            throw new DeveloperError('times is required.');
        }
        if (!defined(values)) {
            throw new DeveloperError('values is required.');
        }
        if (times.length !== values.length) {
            throw new DeveloperError('times and values must be the same length.');
        }
        //>>includeEnd('debug');

        var innerType = this._innerType;
        var length = times.length;
        var data = [];
        for ( var i = 0; i < length; i++) {
            data.push(times[i]);
            innerType.pack(values[i], data, data.length);
        }
        mergeNewSamples(undefined, this._times, this._values, data, innerType.packedLength);
        this._updateTableLength = true;
    };

    /**
     * Adds samples as a single packed array where each new sample is represented as a date, followed by the packed representation of the corresponding value.
     * @memberof SampledProperty
     *
     * @param {Array} packedSamples The array of packed samples.
     * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
     */
    SampledProperty.prototype.addSamplesPackedArray = function(packedSamples, epoch) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(packedSamples)) {
            throw new DeveloperError('packedSamples is required.');
        }
        //>>includeEnd('debug');

        mergeNewSamples(epoch, this._times, this._values, packedSamples, this._innerType.packedLength);
        this._updateTableLength = true;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof SampledProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    SampledProperty.prototype.equals = function(other) {
        if (this === other) {
            return true;
        }
        if (!defined(other)) {
            return false;
        }

        var times = this._times;
        var otherTimes = other._times;
        var length = times.length;

        if (length !== otherTimes.length) {
            return false;
        }

        var i;
        for (i = 0; i < length; i++) {
            if (!JulianDate.equals(times[i], otherTimes[i])) {
                return false;
            }
        }

        var values = this._values;
        var otherValues = other._values;
        for (i = 0; i < length; i++) {
            if (values[i] !== otherValues[i]) {
                return false;
            }
        }

        return this._type === other._type && //
               this._interpolationDegree === other._interpolationDegree && //
               this._interpolationAlgorithm === other._interpolationAlgorithm;
    };

    //Exposed for testing.
    SampledProperty._mergeNewSamples = mergeNewSamples;

    return SampledProperty;
});