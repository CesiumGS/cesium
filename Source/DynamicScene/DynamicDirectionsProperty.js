/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/Math',
        './DynamicPositionProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Spherical,
        CesiumMath,
        DynamicPositionProperty) {
    "use strict";

    function PositionHolder(czmlInterval) {
        var i, len, values = [], tmp;

        tmp = czmlInterval.unitSpherical || czmlInterval.spherical;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 2) {
                values.push(new Spherical(tmp[i], tmp[i + 1]));
            }
            this.spherical = values;
        }

        tmp = czmlInterval.cartesian;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartesian3(tmp[i], tmp[i + 1], tmp[i + 2]));
            }
            this.cartesian = values;
        }
    }

    PositionHolder.prototype.getValueSpherical = function() {
        var sphericals = this.spherical;
        if (typeof sphericals === 'undefined') {
            sphericals = [];
            this.spherical = sphericals;
            var cartesians = this.cartesian;
            for ( var i = 0, len = cartesians.length; i < len; i++) {
                sphericals[i].push(Spherical.fromCartesian3(cartesians[i]));
            }
        }
        return sphericals;
    };

    PositionHolder.prototype.getValueCartesian = function() {
        var cartesians = this.cartesian;
        if (typeof cartesians === 'undefined') {
            cartesians = [];
            this.cartesian = cartesians;
            var sphericals = this.spherical;
            for ( var i = 0, len = sphericals.length; i < len; i++) {
                cartesians[i].push(Cartesian3.fromSpherical(sphericals[i]));
            }
        }
        return cartesians;
    };

    function DynamicDirectionsProperty() {
        this._propertyIntervals = new TimeIntervalCollection();
    }

    DynamicDirectionsProperty.createOrUpdate = function(czmlIntervals, buffer, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicDirectionsProperty();
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri);

        return existingProperty;
    };

    DynamicDirectionsProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri);
        }
    };

    DynamicDirectionsProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri) {
        //Parse the interval
        var iso8601Interval = czmlInterval.interval, intervalStart, intervalStop;
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

        //If not, create it.
        if (typeof existingInterval === 'undefined') {
            existingInterval = new TimeInterval(intervalStart, intervalStop, true, true);
            this_intervals.addInterval(existingInterval);
        }

        var objects = czmlInterval.objects;
        if (typeof objects === 'undefined') {
            existingInterval.data = new PositionHolder(czmlInterval);
        } else {
            var properties = [];
            properties.buffer = buffer;
            for ( var i = 0, len = objects.length; i < len; i++) {
                properties.push(objects[i]);
            }
            existingInterval.data = properties;
        }
    };

    //FIXME Both getValueSpherical and getValueCartesian that the linked property
    //is never completely replaced.  This will cause problems when we have a composite
    //CZML collection of several different CZML files.

    var resolveReference = function(referenceString, buffer) {
        var parts = referenceString.split(".");
        if (parts.length === 2) {
            var objectId = parts[0].slice(1);
            var property = parts[1];
            if (typeof objectId !== 'undefined' && typeof property !== 'undefined') {
                var object = buffer.getObject(objectId);
                if (typeof object !== 'undefined') {
                    return object[property];
                }
            }
        }
    };

    DynamicDirectionsProperty.prototype.getValueSpherical = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var buffer = interval_data.buffer, result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var item = interval_data[i];
                if (typeof item === 'string') {
                    var property = resolveReference(item, buffer);
                    if (typeof property !== 'undefined') {
                        item = property;
                        interval_data[i] = item;
                    }
                }
                if (typeof item !== 'undefined') {
                    var value = item.getValue(time);
                    if (typeof value !== 'undefined') {
                        result.push(value);
                    }
                }
            }
            return result;
        }

        return interval_data.getValueSpherical();
    };

    DynamicDirectionsProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var buffer = interval_data.buffer, result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var item = interval_data[i];
                if (typeof item === 'string') {
                    var property = resolveReference(item, buffer);
                    if (typeof property !== 'undefined') {
                        item = property;
                        interval_data[i] = item;
                    }
                }
                if (typeof item !== 'undefined') {
                    var value = item.getValueCartesian(time);
                    if (typeof value !== 'undefined') {
                        result.push(value);
                    }
                }
            }
            return result;
        }

        return interval_data.getValueCartesian();
    };

    return DynamicDirectionsProperty;
});