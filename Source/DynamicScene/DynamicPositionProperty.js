/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Iso8601',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        './CzmlCartesian3',
        './CzmlCartographic',
        './DynamicProperty'
    ], function(
        DeveloperError,
        Ellipsoid,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Iso8601,
        Cartesian3,
        Cartographic,
        CzmlCartesian3,
        CzmlCartographic,
        DynamicProperty) {
    "use strict";

    var wgs84 = Ellipsoid.WGS84;
    var potentialTypes = [CzmlCartesian3, CzmlCartographic];

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
        if (this._cachedTime !== time) {
            this._cachedTime = time;
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._propertyIntervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        var valueType = property.valueType;
        if (valueType === CzmlCartographic) {
            return property.getValue(time, result);
        }
        result = interval.cachedValue = property.getValue(time, interval.cachedValue);
        if (typeof result !== 'undefined') {
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
        if (this._cachedTime !== time) {
            this._cachedTime = time;
            if (typeof interval === 'undefined' || !interval.contains(time)) {
                interval = this._propertyIntervals.findIntervalContainingDate(time);
                this._cachedInterval = interval;
            }
        }

        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        var valueType = property.valueType;
        if (valueType === CzmlCartesian3) {
            return property.getValue(time, result);
        }
        result = interval.cachedValue = property.getValue(time, interval.cachedValue);
        if (typeof result !== 'undefined') {
            result = wgs84.cartographicToCartesian(result);
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
     * @returns The modified result array or a new instance if none was provided.
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
        //Always step exactly on start.
        result[r] = this.getValueCartesian(start, result[r++]);

        var scratchCartographic;
        var steppedOnNow = typeof currentTime === 'undefined';
        for ( var i = startIndex; i < stopIndex + 1; i++) {
            var current;
            var interval = propertyIntervals.get(i);
            var nextInterval = propertyIntervals.get(i + 1);
            var loopStop = stop;
            if (typeof nextInterval !== 'undefined' && stop.greaterThan(nextInterval.start)) {
                loopStop = nextInterval.start;
            }
            var property = interval.data;
            var valueType = property.valueType;
            var currentInterval = property._intervals.get(0);
            var times = currentInterval.data.times;
            if (typeof times !== 'undefined') {
                //Iterate over all interval times and add the ones that fall in our
                //time range.  Note that times can contain data outside of
                //the intervals range.  This is by design for use with interpolation.
                var t;
                if (valueType === CzmlCartesian3) {
                    for (t = 0; t < times.length; t++) {
                        current = times[t];
                        if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                            result[r] = property.getValue(currentTime, result[r++]);
                            steppedOnNow = true;
                        }
                        if (current.greaterThan(start) && current.lessThan(loopStop)) {
                            result[r] = property.getValue(current, result[r++]);
                        }
                    }
                } else {
                    for (t = 0; t < times.length; t++) {
                        current = times[t];
                        if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                            scratchCartographic = property.getValue(currentTime, scratchCartographic);
                            result[r++] = wgs84.cartographicToCartesian(scratchCartographic);
                            steppedOnNow = true;
                        }
                        if (current.greaterThan(start) && current.lessThan(loopStop)) {
                            scratchCartographic = property.getValue(current, scratchCartographic);
                            result[r++] = wgs84.cartographicToCartesian(scratchCartographic);
                        }
                    }
                }
            } else {
                //If times is undefined, it's because the interval contains a single position
                //at which it stays for the duration of the interval.
                current = interval.start;
                if (valueType === CzmlCartesian3) {
                    if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                        result[r] = property.getValue(currentTime, result[r++]);
                        steppedOnNow = true;
                    }
                    if (current.greaterThan(start) && current.lessThan(loopStop)) {
                        result[r] = property.getValue(current, result[r++]);
                    }
                } else {
                    if (!steppedOnNow && current.greaterThanOrEquals(currentTime)) {
                        scratchCartographic = property.getValue(currentTime, scratchCartographic);
                        result[r++] = wgs84.cartographicToCartesian(scratchCartographic);
                        steppedOnNow = true;
                    }
                    if (current.greaterThan(start) && current.lessThan(loopStop)) {
                        scratchCartographic = property.getValue(current, scratchCartographic);
                        result[r++] = wgs84.cartographicToCartesian(scratchCartographic);
                    }
                }
            }
        }

        //Always step exactly on stop.
        result[r] = this.getValueCartesian(stop, result[r++]);

        result.length = r;
        return result;
    };

    DynamicPositionProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval) {
        this._cachedTime = undefined;
        this._cachedInterval = undefined;

        var iso8601Interval = czmlInterval.interval, property, valueType, unwrappedInterval;
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
                valueType = property.valueType;
                unwrappedInterval = valueType.unwrapInterval(czmlInterval);
            }
        } else {
            //If not, create it.
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        //If the new data was a different type, unwrapping fails, look for a valueType for this type.
        if (typeof unwrappedInterval === 'undefined') {
            for ( var i = 0, len = potentialTypes.length; i < len; i++) {
                valueType = potentialTypes[i];
                unwrappedInterval = valueType.unwrapInterval(czmlInterval);
                if (typeof unwrappedInterval !== 'undefined') {
                    property = new DynamicProperty(valueType);
                    this._dynamicProperties.push(property);
                    existingInterval.data = property;
                    break;
                }
            }
        }

        //We could handle the data, add it to the property.
        if (typeof unwrappedInterval !== 'undefined') {
            property._addCzmlIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, unwrappedInterval, czmlInterval.epoch, czmlInterval.interpolationAlgorithm,
                    czmlInterval.interpolationDegree);
        }
    };

    return DynamicPositionProperty;
});