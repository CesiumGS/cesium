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
                    property = undefined;
                    //Found a valid valueType, but lets check to see if we already have a property with that valueType
                    for ( var q = 0, lenQ = this._dynamicProperties.length; q < lenQ; q++) {
                        if (this._dynamicProperties[q].valueType === valueType) {
                            property = this._dynamicProperties[q];
                            break;
                        }
                    }
                    //If we don't have the property, create it.
                    if (typeof property === 'undefined') {
                        property = new DynamicProperty(valueType);
                        this._dynamicProperties.push(property);
                        //Save the property in our interval.
                        existingInterval.data = property;
                    }
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