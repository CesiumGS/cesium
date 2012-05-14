/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        './Cartesian3DataHandler',
        './Cartographic3DataHandler',
        './DynamicProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3DataHandler,
        Cartographic3DataHandler,
        DynamicProperty) {
    "use strict";

    function DynamicPositionProperty() {
        this._dynamicProperties = [];
        this._propertyIntervals = new TimeIntervalCollection();
        this._potentialDataHandlers = [Cartesian3DataHandler, Cartographic3DataHandler];
    }

    DynamicPositionProperty.createOrUpdate = function(czmlIntervals, buffer, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicPositionProperty();
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri);

        return existingProperty;
    };

    DynamicPositionProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri);
        }
    };

    DynamicPositionProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri) {
        //Parse the interval
        var iso8601Interval = czmlInterval.interval, intervalStart, intervalStop, property, handler, unwrappedInterval;
        if (typeof iso8601Interval === 'undefined') {
            //FIXME, figure out how to properly handle "infinite" intervals.
            intervalStart = JulianDate.fromIso8601("0000-01-01T00:00Z");
            intervalStop = JulianDate.fromIso8601("9999-12-31T24:00Z");
        } else {
            iso8601Interval = iso8601Interval.split('/');
            intervalStart = JulianDate.fromIso8601(iso8601Interval[0]);
            intervalStop = JulianDate.fromIso8601(iso8601Interval[1]);
        }

        //See if we already have data at that interval.
        var this_intervals = this._propertyIntervals;
        var existingInterval = this_intervals.findInterval(intervalStart, intervalStop);

        if (typeof existingInterval !== 'undefined') {
            //If so, see if the new data is the same type.
            property = existingInterval.data;
            if (typeof property !== 'undefined') {
                handler = property.handler;
                unwrappedInterval = handler.unwrapCzmlInterval(czmlInterval);
            }
        } else {
            //If not, create it.
            existingInterval = new TimeInterval(intervalStart, intervalStop, true, true);
            this_intervals.addInterval(existingInterval);
        }

        //If the new data was a different type, unwrapping fails, look for a handler for this type.
        if (typeof unwrappedInterval === 'undefined') {
            for ( var i = 0, len = this._potentialDataHandlers.length; i < len; i++) {
                handler = this._potentialDataHandlers[i];
                unwrappedInterval = handler.unwrapCzmlInterval(czmlInterval);
                if (typeof unwrappedInterval !== 'undefined') {
                    //Found a valid handler, but lets check to see if we already have a property with that handler
                    for ( var q = 0, lenQ = this._dynamicProperties.length; q < lenQ; q++) {
                        if (this._dynamicProperties[q].handler === handler) {
                            property = this._dynamicProperties[q];
                            break;
                        }
                    }
                    //If we don't have the property, create it.
                    if (typeof property === 'undefined') {
                        property = new DynamicProperty(handler);
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
            property.addIntervalUnwrapped(intervalStart, intervalStop, czmlInterval, unwrappedInterval, buffer, sourceUri);
        }
    };

    DynamicPositionProperty.prototype.getValueCartographic = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        var result = property.getValue(time);
        if (typeof result !== undefined) {
            result = property.dataHandler.convertToCartographic(result);
        }
        return result;
    };

    DynamicPositionProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var property = interval.data;
        var result = property.getValue(time);
        if (typeof result !== undefined) {
            result = property.dataHandler.convertToCartesian(result);
        }
        return result;
    };

    return DynamicPositionProperty;
});