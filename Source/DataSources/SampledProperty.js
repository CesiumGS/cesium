define([
        '../Core/binarySearch',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/ExtrapolationType',
        '../Core/JulianDate',
        '../Core/LinearApproximation'
    ], function(
        binarySearch,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        ExtrapolationType,
        JulianDate,
        LinearApproximation) {
    'use strict';

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
        return JulianDate.addSeconds(epoch, date, new JulianDate());
    }

    var timesSpliceArgs = [];
    var valuesSpliceArgs = [];

    function mergeNewSamples(epoch, times, values, newData, packedLength) {
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
    }

    /**
     * A {@link Property} whose value is interpolated for a given time from the
     * provided set of samples and specified interpolation algorithm and degree.
     * @alias SampledProperty
     * @constructor
     *
     * @param {Number|Packable} type The type of property.
     * @param {Packable[]} [derivativeTypes] When supplied, indicates that samples will contain derivative information of the specified types.
     *
     *
     * @example
     * //Create a linearly interpolated Cartesian2
     * var property = new Cesium.SampledProperty(Cesium.Cartesian2);
     *
     * //Populate it with data
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:00.00Z'), new Cesium.Cartesian2(0, 0));
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-02T00:00:00.00Z'), new Cesium.Cartesian2(4, 7));
     *
     * //Retrieve an interpolated value
     * var result = property.getValue(Cesium.JulianDate.fromIso8601('2012-08-01T12:00:00.00Z'));
     *
     * @example
     * //Create a simple numeric SampledProperty that uses third degree Hermite Polynomial Approximation
     * var property = new Cesium.SampledProperty(Number);
     * property.setInterpolationOptions({
     *     interpolationDegree : 3,
     *     interpolationAlgorithm : Cesium.HermitePolynomialApproximation
     * });
     *
     * //Populate it with data
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:00.00Z'), 1.0);
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:01:00.00Z'), 6.0);
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:02:00.00Z'), 12.0);
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:03:30.00Z'), 5.0);
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:06:30.00Z'), 2.0);
     *
     * //Samples can be added in any order.
     * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:30.00Z'), 6.2);
     *
     * //Retrieve an interpolated value
     * var result = property.getValue(Cesium.JulianDate.fromIso8601('2012-08-01T00:02:34.00Z'));
     *
     * @see SampledPositionProperty
     */
    function SampledProperty(type, derivativeTypes) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        var innerType = type;
        if (innerType === Number) {
            innerType = PackableNumber;
        }
        var packedLength = innerType.packedLength;
        var packedInterpolationLength = defaultValue(innerType.packedInterpolationLength, packedLength);

        var inputOrder = 0;
        var innerDerivativeTypes;
        if (defined(derivativeTypes)) {
            var length = derivativeTypes.length;
            innerDerivativeTypes = new Array(length);
            for (var i = 0; i < length; i++) {
                var derivativeType = derivativeTypes[i];
                if (derivativeType === Number) {
                    derivativeType = PackableNumber;
                }
                var derivativePackedLength = derivativeType.packedLength;
                packedLength += derivativePackedLength;
                packedInterpolationLength += defaultValue(derivativeType.packedInterpolationLength, derivativePackedLength);
                innerDerivativeTypes[i] = derivativeType;
            }
            inputOrder = length;
        }

        this._type = type;
        this._innerType = innerType;
        this._interpolationDegree = 1;
        this._interpolationAlgorithm = LinearApproximation;
        this._numberOfPoints = 0;
        this._times = [];
        this._values = [];
        this._xTable = [];
        this._yTable = [];
        this._packedLength = packedLength;
        this._packedInterpolationLength = packedInterpolationLength;
        this._updateTableLength = true;
        this._interpolationResult = new Array(packedInterpolationLength);
        this._definitionChanged = new Event();
        this._derivativeTypes = derivativeTypes;
        this._innerDerivativeTypes = innerDerivativeTypes;
        this._inputOrder = inputOrder;
        this._forwardExtrapolationType = ExtrapolationType.NONE;
        this._forwardExtrapolationDuration = 0;
        this._backwardExtrapolationType = ExtrapolationType.NONE;
        this._backwardExtrapolationDuration = 0;
    }

    defineProperties(SampledProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof SampledProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return this._values.length === 0;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof SampledProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets the type of property.
         * @memberof SampledProperty.prototype
         * @type {*}
         */
        type : {
            get : function() {
                return this._type;
            }
        },
        /**
         * Gets the derivative types used by this property.
         * @memberof SampledProperty.prototype
         * @type {Packable[]}
         */
        derivativeTypes : {
            get : function() {
                return this._derivativeTypes;
            }
        },
        /**
         * Gets the degree of interpolation to perform when retrieving a value.
         * @memberof SampledProperty.prototype
         * @type {Number}
         * @default 1
         */
        interpolationDegree : {
            get : function() {
                return this._interpolationDegree;
            }
        },
        /**
         * Gets the interpolation algorithm to use when retrieving a value.
         * @memberof SampledProperty.prototype
         * @type {InterpolationAlgorithm}
         * @default LinearApproximation
         */
        interpolationAlgorithm : {
            get : function() {
                return this._interpolationAlgorithm;
            }
        },
        /**
         * Gets or sets the type of extrapolation to perform when a value
         * is requested at a time after any available samples.
         * @memberof SampledProperty.prototype
         * @type {ExtrapolationType}
         * @default ExtrapolationType.NONE
         */
        forwardExtrapolationType : {
            get : function() {
                return this._forwardExtrapolationType;
            },
            set : function(value) {
                if (this._forwardExtrapolationType !== value) {
                    this._forwardExtrapolationType = value;
                    this._definitionChanged.raiseEvent(this);
                }
            }
        },
        /**
         * Gets or sets the amount of time to extrapolate forward before
         * the property becomes undefined.  A value of 0 will extrapolate forever.
         * @memberof SampledProperty.prototype
         * @type {Number}
         * @default 0
         */
        forwardExtrapolationDuration : {
            get : function() {
                return this._forwardExtrapolationDuration;
            },
            set : function(value) {
                if (this._forwardExtrapolationDuration !== value) {
                    this._forwardExtrapolationDuration = value;
                    this._definitionChanged.raiseEvent(this);
                }
            }
        },
        /**
         * Gets or sets the type of extrapolation to perform when a value
         * is requested at a time before any available samples.
         * @memberof SampledProperty.prototype
         * @type {ExtrapolationType}
         * @default ExtrapolationType.NONE
         */
        backwardExtrapolationType : {
            get : function() {
                return this._backwardExtrapolationType;
            },
            set : function(value) {
                if (this._backwardExtrapolationType !== value) {
                    this._backwardExtrapolationType = value;
                    this._definitionChanged.raiseEvent(this);
                }
            }
        },
        /**
         * Gets or sets the amount of time to extrapolate backward
         * before the property becomes undefined.  A value of 0 will extrapolate forever.
         * @memberof SampledProperty.prototype
         * @type {Number}
         * @default 0
         */
        backwardExtrapolationDuration : {
            get : function() {
                return this._backwardExtrapolationDuration;
            },
            set : function(value) {
                if (this._backwardExtrapolationDuration !== value) {
                    this._backwardExtrapolationDuration = value;
                    this._definitionChanged.raiseEvent(this);
                }
            }
        }
    });

    /**
     * Gets the value of the property at the provided time.
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

        var times = this._times;
        var timesLength = times.length;
        if (timesLength === 0) {
            return undefined;
        }

        var timeout;
        var innerType = this._innerType;
        var values = this._values;
        var index = binarySearch(times, time, JulianDate.compare);

        if (index < 0) {
            index = ~index;

            if (index === 0) {
                var startTime = times[index];
                timeout = this._backwardExtrapolationDuration;
                if (this._backwardExtrapolationType === ExtrapolationType.NONE || (timeout !== 0 && JulianDate.secondsDifference(startTime, time) > timeout)) {
                    return undefined;
                }
                if (this._backwardExtrapolationType === ExtrapolationType.HOLD) {
                    return innerType.unpack(values, 0, result);
                }
            }

            if (index >= timesLength) {
                index = timesLength - 1;
                var endTime = times[index];
                timeout = this._forwardExtrapolationDuration;
                if (this._forwardExtrapolationType === ExtrapolationType.NONE || (timeout !== 0 && JulianDate.secondsDifference(time, endTime) > timeout)) {
                    return undefined;
                }
                if (this._forwardExtrapolationType === ExtrapolationType.HOLD) {
                    index = timesLength - 1;
                    return innerType.unpack(values, index * innerType.packedLength, result);
                }
            }

            var xTable = this._xTable;
            var yTable = this._yTable;
            var interpolationAlgorithm = this._interpolationAlgorithm;
            var packedInterpolationLength = this._packedInterpolationLength;
            var inputOrder = this._inputOrder;

            if (this._updateTableLength) {
                this._updateTableLength = false;
                var numberOfPoints = Math.min(interpolationAlgorithm.getRequiredDataPoints(this._interpolationDegree, inputOrder), timesLength);
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

            var firstIndex = 0;
            var lastIndex = timesLength - 1;
            var pointsInCollection = lastIndex - firstIndex + 1;

            if (pointsInCollection >= degree + 1) {
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
            for (var i = 0; i < length; ++i) {
                xTable[i] = JulianDate.secondsDifference(times[firstIndex + i], times[lastIndex]);
            }

            if (!defined(innerType.convertPackedArrayForInterpolation)) {
                var destinationIndex = 0;
                var packedLength = this._packedLength;
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
            var x = JulianDate.secondsDifference(time, times[lastIndex]);
            var interpolationResult;
            if (inputOrder === 0 || !defined(interpolationAlgorithm.interpolate)) {
                interpolationResult = interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, packedInterpolationLength, this._interpolationResult);
            } else {
                var yStride = Math.floor(packedInterpolationLength / (inputOrder + 1));
                interpolationResult = interpolationAlgorithm.interpolate(x, xTable, yTable, yStride, inputOrder, inputOrder, this._interpolationResult);
            }

            if (!defined(innerType.unpackInterpolationResult)) {
                return innerType.unpack(interpolationResult, 0, result);
            }
            return innerType.unpackInterpolationResult(interpolationResult, values, firstIndex, lastIndex, result);
        }
        return innerType.unpack(values, index * this._packedLength, result);
    };

    /**
     * Sets the algorithm and degree to use when interpolating a value.
     *
     * @param {Object} [options] Object with the following properties:
     * @param {InterpolationAlgorithm} [options.interpolationAlgorithm] The new interpolation algorithm.  If undefined, the existing property will be unchanged.
     * @param {Number} [options.interpolationDegree] The new interpolation degree.  If undefined, the existing property will be unchanged.
     */
    SampledProperty.prototype.setInterpolationOptions = function(options) {
        if (!defined(options)) {
            return;
        }

        var valuesChanged = false;

        var interpolationAlgorithm = options.interpolationAlgorithm;
        var interpolationDegree = options.interpolationDegree;

        if (defined(interpolationAlgorithm) && this._interpolationAlgorithm !== interpolationAlgorithm) {
            this._interpolationAlgorithm = interpolationAlgorithm;
            valuesChanged = true;
        }

        if (defined(interpolationDegree) && this._interpolationDegree !== interpolationDegree) {
            this._interpolationDegree = interpolationDegree;
            valuesChanged = true;
        }

        if (valuesChanged) {
            this._updateTableLength = true;
            this._definitionChanged.raiseEvent(this);
        }
    };

    /**
     * Adds a new sample
     *
     * @param {JulianDate} time The sample time.
     * @param {Packable} value The value at the provided time.
     * @param {Packable[]} [derivatives] The array of derivatives at the provided time.
     */
    SampledProperty.prototype.addSample = function(time, value, derivatives) {
        var innerDerivativeTypes = this._innerDerivativeTypes;
        var hasDerivatives = defined(innerDerivativeTypes);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        if (hasDerivatives && !defined(derivatives)) {
            throw new DeveloperError('derivatives is required.');
        }
        //>>includeEnd('debug');

        var innerType = this._innerType;
        var data = [];
        data.push(time);
        innerType.pack(value, data, data.length);

        if (hasDerivatives) {
            var derivativesLength = innerDerivativeTypes.length;
            for (var x = 0; x < derivativesLength; x++) {
                innerDerivativeTypes[x].pack(derivatives[x], data, data.length);
            }
        }
        mergeNewSamples(undefined, this._times, this._values, data, this._packedLength);
        this._updateTableLength = true;
        this._definitionChanged.raiseEvent(this);
    };

    /**
     * Adds an array of samples
     *
     * @param {JulianDate[]} times An array of JulianDate instances where each index is a sample time.
     * @param {Packable[]} values The array of values, where each value corresponds to the provided times index.
     * @param {Array[]} [derivativeValues] An array where each item is the array of derivatives at the equivalent time index.
     *
     * @exception {DeveloperError} times and values must be the same length.
     * @exception {DeveloperError} times and derivativeValues must be the same length.
     */
    SampledProperty.prototype.addSamples = function(times, values, derivativeValues) {
        var innerDerivativeTypes = this._innerDerivativeTypes;
        var hasDerivatives = defined(innerDerivativeTypes);

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
        if (hasDerivatives && (!defined(derivativeValues) || derivativeValues.length !== times.length)) {
            throw new DeveloperError('times and derivativeValues must be the same length.');
        }
        //>>includeEnd('debug');

        var innerType = this._innerType;
        var length = times.length;
        var data = [];
        for (var i = 0; i < length; i++) {
            data.push(times[i]);
            innerType.pack(values[i], data, data.length);

            if (hasDerivatives) {
                var derivatives = derivativeValues[i];
                var derivativesLength = innerDerivativeTypes.length;
                for (var x = 0; x < derivativesLength; x++) {
                    innerDerivativeTypes[x].pack(derivatives[x], data, data.length);
                }
            }
        }
        mergeNewSamples(undefined, this._times, this._values, data, this._packedLength);
        this._updateTableLength = true;
        this._definitionChanged.raiseEvent(this);
    };

    /**
     * Adds samples as a single packed array where each new sample is represented as a date,
     * followed by the packed representation of the corresponding value and derivatives.
     *
     * @param {Number[]} packedSamples The array of packed samples.
     * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
     */
    SampledProperty.prototype.addSamplesPackedArray = function(packedSamples, epoch) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(packedSamples)) {
            throw new DeveloperError('packedSamples is required.');
        }
        //>>includeEnd('debug');

        mergeNewSamples(epoch, this._times, this._values, packedSamples, this._packedLength);
        this._updateTableLength = true;
        this._definitionChanged.raiseEvent(this);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
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

        if (this._type !== other._type || //
            this._interpolationDegree !== other._interpolationDegree || //
            this._interpolationAlgorithm !== other._interpolationAlgorithm) {
            return false;
        }

        var derivativeTypes = this._derivativeTypes;
        var hasDerivatives = defined(derivativeTypes);
        var otherDerivativeTypes = other._derivativeTypes;
        var otherHasDerivatives = defined(otherDerivativeTypes);
        if (hasDerivatives !== otherHasDerivatives) {
            return false;
        }

        var i;
        var length;
        if (hasDerivatives) {
            length = derivativeTypes.length;
            if (length !== otherDerivativeTypes.length) {
                return false;
            }

            for (i = 0; i < length; i++) {
                if (derivativeTypes[i] !== otherDerivativeTypes[i]) {
                    return false;
                }
            }
        }

        var times = this._times;
        var otherTimes = other._times;
        length = times.length;

        if (length !== otherTimes.length) {
            return false;
        }

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

        return true;
    };

    //Exposed for testing.
    SampledProperty._mergeNewSamples = mergeNewSamples;

    return SampledProperty;
});
