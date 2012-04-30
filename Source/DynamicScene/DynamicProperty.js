/*global define*/
define(['Core/JulianDate', 'Core/TimeInterval', 'Core/TimeIntervalCollection', 'Core/binarySearch', 'Core/HermitePolynomialApproximation', 'Core/LinearApproximation',
        'Core/LagrangePolynomialApproximation'], function(JulianDate, TimeInterval, TimeIntervalCollection, binarySearch, HermitePolynomialApproximation, LinearApproximation,
        LagrangePolynomialApproximation) {
    "use strict";

    var interpolators = {
        HERMITE : HermitePolynomialApproximation,
        LAGRANGE : LagrangePolynomialApproximation,
        LINEAR : LinearApproximation
    };

    function DynamicProperty(dataHandler) {
        this._dataHandler = dataHandler;
        this._intervals = new TimeIntervalCollection();
    }

    function convertDate(date, epoch) {
        if (typeof date === 'string') {
            return JulianDate.createFromIso601(date);
        }
        return epoch.addSeconds(date);
    }

    DynamicProperty._mergeNewSamples = function(epoch, times, values, newData, elementsPerItem) {
        ///TODO This method can be further optimized.
        var newDataIndex = 0, i, prevItem, timesInsertionPoint, valuesInsertionPoint, timesSpliceArgs, valuesSpliceArgs, currentTime, nextTime;
        while (newDataIndex < newData.length) {
            currentTime = convertDate(newData[newDataIndex], epoch);
            timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);

            if (timesInsertionPoint < 0) {
                //Doesn't exist, insert as many additional values as we can.
                timesInsertionPoint = ~timesInsertionPoint;
                timesSpliceArgs = [timesInsertionPoint, 0];

                valuesInsertionPoint = timesInsertionPoint * elementsPerItem;
                valuesSpliceArgs = [valuesInsertionPoint, 0];
                prevItem = undefined;
                nextTime = times[timesInsertionPoint + 1];
                while (newDataIndex < newData.length) {
                    currentTime = convertDate(newData[newDataIndex], epoch);

                    //TODO We can further optimize by dealing with the special cases of === here, rather than bailing.
                    if ((typeof prevItem !== 'undefined' && JulianDate.compare(prevItem, currentTime) >= 0) || (typeof nextTime !== 'undefined' && JulianDate.compare(currentTime, nextTime) >= 0)) {
                        break;
                    }
                    timesSpliceArgs.push(currentTime);
                    newDataIndex = newDataIndex + 1;
                    for (i = 0; i < elementsPerItem; i++) {
                        valuesSpliceArgs.push(newData[newDataIndex]);
                        newDataIndex = newDataIndex + 1;
                    }
                    prevItem = currentTime;
                }

                Array.prototype.splice.apply(values, valuesSpliceArgs);
                Array.prototype.splice.apply(times, timesSpliceArgs);
            } else {
                //Found an exact match
                for (i = 0; i < elementsPerItem; i++) {
                    newDataIndex++;
                    values[(timesInsertionPoint * elementsPerItem) + i] = newData[newDataIndex];
                }
                newDataIndex++;
            }
        }
    };

    DynamicProperty.prototype._addPacket = function(packet, buffer, sourceUri) {
        var this_intervals = this._intervals;
        var this_dataHandler = this._dataHandler;
        var packetData = this_dataHandler.getPacketData(packet);
        var iso8601Interval = packet.interval || "0000-01-01/9999-12-31"; //FIXME We need a real infinite interval to use.
        iso8601Interval = iso8601Interval.split('/');
        var packetInterval = new TimeInterval(JulianDate.createFromIso8601(iso8601Interval[0]), JulianDate.createFromIso8601(iso8601Interval[1]), true, true);
        var existingInterval = this_intervals.findInterval(packetInterval);
        var intervalData;

        if (existingInterval === null) {
            intervalData = {
                interpolationAlgorithm : LinearApproximation,
                numberOfPoints : LinearApproximation.getRequiredDataPoints(1)
            };

            packetInterval.data = intervalData;
            existingInterval = packetInterval;
            this_intervals.addInterval(packetInterval);
        } else {
            intervalData = existingInterval.data;
        }

        var interpolationAlgorithm;
        var interpolationAlgorithmType = packet.interpolationAlgorithm;
        if (interpolationAlgorithmType) {
            interpolationAlgorithm = interpolators[interpolationAlgorithmType];
            intervalData.interpolationAlgorithm = interpolationAlgorithm;
        }
        var interpolationDegree = packet.interpolationDegree;
        if (interpolationAlgorithm && interpolationDegree) {
            intervalData.interpolationDegree = interpolationDegree;
            intervalData.numberOfPoints = interpolationAlgorithm.getRequiredDataPoints(interpolationDegree, 0);
            intervalData.xTable = undefined;
            intervalData.yTable = undefined;
        }

        if (this_dataHandler.isSampled(packetData)) {
            if (!intervalData.isSampled) {
                intervalData.times = [];
                intervalData.values = [];
                intervalData.isSampled = true;
            }
            var epoch = packet.epoch;
            if (typeof epoch !== 'undefined') {
                epoch = JulianDate.createFromIso8601(epoch);
            }
            DynamicProperty._mergeNewSamples(epoch, intervalData.times, intervalData.values, packetData, this_dataHandler.elementsPerItem, JulianDate.compare);
        } else {
            //Packet itself is a constant value
            intervalData.times = undefined;
            intervalData.values = packetData;
            intervalData.isSampled = false;
        }
    };

    DynamicProperty.prototype.addData = function(packets, buffer, sourceUri) {
        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._addPacket(packets[i], buffer, sourceUri);
            }
        } else {
            this._addPacket(packets, buffer, sourceUri);
        }
    };

    DynamicProperty.prototype.getValue = function(time) {
        var this_dataHandler = this._dataHandler;
        var interval = this._intervals.findIntervalContainingDate(time);

        if (interval !== null) {
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

                    var elementsPerInterpolationItem = this_dataHandler.elementsPerInterpolationItem, xTable = intervalData.xTable, yTable = intervalData.yTable;

                    if (typeof xTable === 'undefined') {
                        xTable = intervalData.xTable = new Array(intervalData.numberOfPoints);
                        yTable = intervalData.yTable = new Array(intervalData.numberOfPoints * elementsPerInterpolationItem);
                    }

                    // Build the tables
                    for ( var i = 0; i < length; ++i) {
                        xTable[i] = times[lastIndex].getSecondsDifference(times[firstIndex + i]);
                    }
                    this_dataHandler.extractInterpolationTable(values, yTable, firstIndex, lastIndex);

                    // Interpolate!
                    var x = times[lastIndex].getSecondsDifference(time);
                    var interpolationFunction = intervalData.interpolationAlgorithm.interpolateOrderZero;
                    var result = interpolationFunction(x, xTable, yTable, elementsPerInterpolationItem);

                    return this_dataHandler.interpretInterpolationResult(result, values, firstIndex, lastIndex);
                }
                return this_dataHandler.extractValueAt(index, intervalData.values);
            }
            return this_dataHandler.extractValue(intervalData.values);
        }
        return undefined;
    };

    return DynamicProperty;
});