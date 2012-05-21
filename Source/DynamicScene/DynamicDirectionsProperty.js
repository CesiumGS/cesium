/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/Math',
        './ReferenceProperty',
        './DynamicPositionProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Spherical,
        CesiumMath,
        ReferenceProperty,
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

    DynamicDirectionsProperty.createOrUpdate = function(parentObject, propertyName, czmlIntervals, constrainedInterval, czmlObjectCollection) {
        var newProperty = false;
        var existingProperty = parentObject[propertyName];
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicDirectionsProperty();
            parentObject[propertyName] = existingProperty;
            newProperty = true;
        }

        existingProperty.addIntervals(czmlIntervals, czmlObjectCollection, constrainedInterval);

        return newProperty;
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
        var iso8601Interval = czmlInterval.interval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = TimeInterval.INFINITE.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        //See if we already have data at that interval.
        var this_intervals = this._propertyIntervals;
        var existingInterval = this_intervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        //If not, create it.
        if (typeof existingInterval === 'undefined') {
            existingInterval = iso8601Interval;
            this_intervals.addInterval(existingInterval);
        }

        var references = czmlInterval.references;
        if (typeof references === 'undefined') {
            existingInterval.data = new PositionHolder(czmlInterval);
        } else {
            var properties = [];
            properties.buffer = buffer;
            for ( var i = 0, len = references.length; i < len; i++) {
                properties.push(ReferenceProperty.fromString(buffer, references[i]));
            }
            existingInterval.data = properties;
        }
    };

    DynamicDirectionsProperty.prototype.getValueSpherical = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var value = interval_data[i].getValueSpherical(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
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
            var result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var value = interval_data[i].getValueCartesian(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
                }
            }
            return result;
        }

        return interval_data.getValueCartesian();
    };

    return DynamicDirectionsProperty;
});