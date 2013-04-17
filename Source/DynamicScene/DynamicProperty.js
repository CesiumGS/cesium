/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/binarySearch',
        '../Core/HermitePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/LagrangePolynomialApproximation'
    ], function(
        DeveloperError,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        binarySearch,
        HermitePolynomialApproximation,
        LinearApproximation,
        LagrangePolynomialApproximation) {
    "use strict";


    //CZML_TODO This is more of an idea than a to-do, but currently DynamicProperty requires
    //you know the type of data being loaded up-front by passing valueType.  We could take
    //a similar approach to DynamicMaterialProperty and have a list of potential valueTypes
    //that we check for when we encounter data.  This would make it possible to support
    //properties that are defined in a CZML document but not part of the official spec.  This
    //would be helpful in cases where a CZML document has $ or # links to other properties,
    //but that property itself is not part of another to-spec CZML object.  We could still
    //allow the user to pass a default valueType if they want to make sure the data
    //being processed is only the data of the expected type.

    //Map CZML interval types to their implementation.
    var interpolators = {
        HERMITE : HermitePolynomialApproximation,
        LAGRANGE : LagrangePolynomialApproximation,
        LINEAR : LinearApproximation
    };

    //The data associated with each DynamicProperty interval.
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

    //Converts a CZML defined data into a JulianDate, regardless of whether it was
    //specified in epoch seconds or as an ISO8601 string.
    function czmlDateToJulianDate(date, epoch) {
        if (typeof date === 'string') {
            return JulianDate.fromIso8601(date);
        }
        return epoch.addSeconds(date);
    }

    /**
     * <p>
     * DynamicProperty represents a single value that changes over time.
     * Rather than creating instances of this object directly, it's typically
     * created and managed via loading CZML data into a DynamicObjectCollection.
     * Instances of this type are exposed via DynamicObject and it's sub-objects
     * and are responsible for interpreting and interpolating the data for visualization.
     * </p>
     * <p>
     * The type of value exposed by this property must be provided during construction
     * by passing in an object which performs all the necessary operations needed to
     * properly store, retrieve, and interpolate the data.  For more specialized needs
     * other types of dynamic properties exist, such as DynamicMaterialProperty,
     * which as the name implies, handles materials.
     * </p>
     *
     * @alias DynamicProperty
     * @constructor
     *
     * @param {Object} valueType A CZML type object which contains the methods needed to interpret and interpolate CZML data of the same type.
     *
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitQuaternion
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     * @see DynamicObject
     * @see ReferenceProperty
     * @see DynamicMaterialProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     */
    var DynamicProperty = function(valueType) {
        if (typeof valueType === 'undefined') {
            throw new DeveloperError('valueType is required.');
        }
        this.valueType = valueType;
        this._intervals = new TimeIntervalCollection();
        this._cachedTime = undefined;
        this._cachedInterval = undefined;
    };

    /**
     * Processes the provided CZML interval or intervals into this property.
     *
     * @memberof DynamicProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     */
    DynamicProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], constrainedInterval, sourceUri);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, constrainedInterval, sourceUri);
        }
    };

    var interpolationScratch;

    /**
     * Returns the value of the property at the specified time.
     * @memberof DynamicProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns The modified result parameter or a new instance if the result parameter was not supplied.
     */
    DynamicProperty.prototype.getValue = function(time, result) {
        var valueType = this.valueType;

        if (typeof this._staticValue !== 'undefined') {
            return valueType.getValue(this._staticValue, result);
        }

        var interval = this._cachedInterval;
        if (!JulianDate.equals(this._cachedTime, time)) {
            this._cachedTime = JulianDate.clone(time, this._cachedTime);
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._intervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }

        var intervalData = interval.data;
        var times = intervalData.times;
        var values = intervalData.values;
        if (intervalData.isSampled && times.length >= 0 && values.length > 0) {
            var doublesPerValue = valueType.doublesPerValue;
            var index = binarySearch(times, time, JulianDate.compare);
            if (index < 0) {
                if (intervalData.numberOfPoints < 2) {
                    return undefined;
                }
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

                var doublesPerInterpolationValue = valueType.doublesPerInterpolationValue;
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
                interpolationScratch = intervalData.interpolationAlgorithm.interpolateOrderZero(x, xTable, yTable, doublesPerInterpolationValue, interpolationScratch);

                var specializedGetFunction = valueType.getValueFromInterpolationResult;
                if (typeof specializedGetFunction === 'undefined') {
                    return valueType.getValueFromArray(interpolationScratch, 0, result);
                }
                return specializedGetFunction(interpolationScratch, result, values, firstIndex, lastIndex);
            }
            return valueType.getValueFromArray(intervalData.values, index * doublesPerValue, result);
        }
        return valueType.getValue(intervalData.values, result);
    };

    DynamicProperty._mergeNewSamples = function(epoch, times, values, newData, doublesPerValue) {
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
                nextTime = times[timesInsertionPoint];
                while (newDataIndex < newData.length) {
                    currentTime = czmlDateToJulianDate(newData[newDataIndex], epoch);
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

    DynamicProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval, sourceUri) {
        var iso8601Interval = czmlInterval.interval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL;
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.intersect(constrainedInterval);
        }

        var unwrappedInterval = this.valueType.unwrapInterval(czmlInterval, sourceUri);
        if (typeof unwrappedInterval !== 'undefined') {
            this._addCzmlIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, unwrappedInterval, czmlInterval.epoch, czmlInterval.interpolationAlgorithm, czmlInterval.interpolationDegree);
        }
    };

    DynamicProperty.prototype._addCzmlIntervalUnwrapped = function(start, stop, unwrappedInterval, epoch, interpolationAlgorithmType, interpolationDegree) {
        var thisIntervals = this._intervals;
        var existingInterval = thisIntervals.findInterval(start, stop);
        this._cachedTime = undefined;
        this._cachedInterval = undefined;

        var intervalData;
        if (typeof existingInterval === 'undefined') {
            intervalData = new IntervalData();
            existingInterval = new TimeInterval(start, stop, true, true, intervalData);
            thisIntervals.addInterval(existingInterval);
        } else {
            intervalData = existingInterval.data;
        }

        var valueType = this.valueType;
        if (valueType.isSampled(unwrappedInterval)) {
            var interpolationAlgorithm;
            if (typeof interpolationAlgorithmType !== 'undefined') {
                interpolationAlgorithm = interpolators[interpolationAlgorithmType];
                intervalData.interpolationAlgorithm = interpolationAlgorithm;
            }
            if (typeof interpolationAlgorithm !== 'undefined' && typeof interpolationDegree !== 'undefined') {
                intervalData.interpolationDegree = interpolationDegree;
                intervalData.xTable = undefined;
                intervalData.yTable = undefined;
            }

            if (!intervalData.isSampled) {
                intervalData.times = [];
                intervalData.values = [];
                intervalData.isSampled = true;
            }
            if (typeof epoch !== 'undefined') {
                epoch = JulianDate.fromIso8601(epoch);
            }
            DynamicProperty._mergeNewSamples(epoch, intervalData.times, intervalData.values, unwrappedInterval, valueType.doublesPerValue, valueType);
            intervalData.numberOfPoints = Math.min(intervalData.interpolationAlgorithm.getRequiredDataPoints(intervalData.interpolationDegree), intervalData.times.length);
            this._staticValue = undefined;
        } else {
            //Packet itself is a constant value
            intervalData.times = undefined;
            intervalData.values = unwrappedInterval;
            intervalData.isSampled = false;

            if (existingInterval.equals(Iso8601.MAXIMUM_INTERVAL)) {
                this._staticValue = unwrappedInterval;
            } else {
                this._staticValue = undefined;
            }
        }
    };

    return DynamicProperty;
});