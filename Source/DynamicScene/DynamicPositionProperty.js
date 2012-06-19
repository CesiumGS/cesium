/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Iso8601',
        '../Core/Cartesian3',
        '../Core/Cartographic3',
        './CzmlCartesian3',
        './CzmlCartographic3',
        './DynamicProperty'
    ], function(
        Ellipsoid,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Iso8601,
        Cartesian3,
        Cartographic3,
        CzmlCartesian3,
        CzmlCartographic3,
        DynamicProperty) {
    "use strict";

    var wgs84 = Ellipsoid.WGS84;

    function DynamicPositionProperty() {
        this._dynamicProperties = [];
        this._propertyIntervals = new TimeIntervalCollection();
        this._potentialTypes = [CzmlCartesian3, CzmlCartographic3];
        this._cachedTime = undefined;
        this._cachedInterval = undefined;
    }

    DynamicPositionProperty.processCzmlPacket = function(czmlIntervals, dynamicObjectCollection, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicPositionProperty();
        }

        existingProperty.addIntervals(czmlIntervals, dynamicObjectCollection, sourceUri);

        return existingProperty;
    };

    DynamicPositionProperty.prototype.addIntervals = function(czmlIntervals, dynamicObjectCollection, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], dynamicObjectCollection, sourceUri);
            }
        } else {
            this.addInterval(czmlIntervals, dynamicObjectCollection, sourceUri);
        }
    };

    DynamicPositionProperty.prototype.addInterval = function(czmlInterval, dynamicObjectCollection, sourceUri) {
        this._cachedTime = undefined;
        this._cachedInterval = undefined;

        var iso8601Interval = czmlInterval.interval, property, valueType, unwrappedInterval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
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
            for ( var i = 0, len = this._potentialTypes.length; i < len; i++) {
                valueType = this._potentialTypes[i];
                unwrappedInterval = valueType.unwrapInterval(czmlInterval);
                if (typeof unwrappedInterval !== 'undefined') {
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
                    }
                    //Save the property in our interval.
                    existingInterval.data = property;
                    break;
                }
            }
        }

        //We could handle the data, add it to the propery.
        if (typeof unwrappedInterval !== 'undefined') {
            property.addIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, czmlInterval, unwrappedInterval, dynamicObjectCollection, sourceUri);
        }
    };

    DynamicPositionProperty.prototype.getValueCartographic = function(time, result) {
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
        if (valueType === CzmlCartographic3) {
            return property.getValue(time, result);
        }
        result = interval.cachedValue = property.getValue(time, interval.cachedValue);
        if (typeof result !== 'undefined') {
            result = wgs84.toCartographic3(result);
        }
        return result;
    };

    DynamicPositionProperty.prototype.getValueCartesian = function(time, result) {
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
            result = wgs84.toCartesian(result);
        }
        return result;
    };

    return DynamicPositionProperty;
});