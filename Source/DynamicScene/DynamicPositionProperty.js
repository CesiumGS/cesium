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
    var potentialTypes = [CzmlCartesian3, CzmlCartographic3];

    /**
     * A dynamic property which stores both Cartesian and Cartographic data
     * and can convert and return the desired type of data for a desired time.
     * Rather than creating instances of this object directly, it's typically
     * created and managed via loading CZML data into a DynamicObjectCollection.
     * Instances of this type are exposed via DynamicObject and it's sub-objects
     * and are responsible for interpreting and interpolating the data for visualization.
     *
     * @name DynamicPositionProperty
     * @internalconstructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicMaterialProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     */
    function DynamicPositionProperty() {
        this._dynamicProperties = [];
        this._propertyIntervals = new TimeIntervalCollection();
        this._cachedTime = undefined;
        this._cachedInterval = undefined;
    }

    /**
     * Processes the provided CZML interval and creates or modifies a DynamicProperty
     * of the provided property name and value type on the parent object.
     *
     * @memberof DynamicPositionProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {DynamicPositionProperty} [existingProperty] The existing property to which to add data, of undefined, a new property will be created.
     * @returns The existingProperty parameter or a new instance of DynamicPositionProperty if existing property was not defined.
     */
    DynamicPositionProperty.processCzmlPacket = function(czmlIntervals, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicPositionProperty();
        }

        existingProperty._addCzmlIntervals(czmlIntervals);

        return existingProperty;
    };

    /**
     * Retrieves the value of the object at the supplied time as a Cartographic3.
     * @memberof DynamicPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartographic3} [result] The object to store the result onto, if undefined a new instance will be created.
     * @returns The modified result property, or a new instance if result was undefined.
     */
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

    /**
     * Retrieves the value of the object at the supplied time as a Cartesian3.
     * @memberof DynamicPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the result onto, if undefined a new instance will be created.
     * @returns The modified result property, or a new instance if result was undefined.
     */
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

    DynamicPositionProperty.prototype._addCzmlIntervals = function(czmlIntervals) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i]);
            }
        } else {
            this._addCzmlInterval(czmlIntervals);
        }
    };

    DynamicPositionProperty.prototype._addCzmlInterval = function(czmlInterval) {
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
            for ( var i = 0, len = potentialTypes.length; i < len; i++) {
                valueType = potentialTypes[i];
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

        //We could handle the data, add it to the property.
        if (typeof unwrappedInterval !== 'undefined') {
            property._addCzmlIntervalUnwrapped(iso8601Interval.start, iso8601Interval.stop, unwrappedInterval, czmlInterval.epoch, czmlInterval.interpolationAlgorithm, czmlInterval.interpolationDegree);
        }
    };

    return DynamicPositionProperty;
});