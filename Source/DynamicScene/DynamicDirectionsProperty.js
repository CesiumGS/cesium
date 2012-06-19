/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/CoordinateConversions',
        '../Core/Math',
        '../Core/Iso8601',
        './ReferenceProperty',
        './DynamicPositionProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Spherical,
        CoordinateConversions,
        CesiumMath,
        Iso8601,
        ReferenceProperty,
        DynamicPositionProperty) {
    "use strict";

    function PositionHolder(czmlInterval) {
        var i, len, values = [], tmp;

        tmp = czmlInterval.unitSpherical;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 2) {
                values.push(new Spherical(tmp[i], tmp[i + 1]));
            }
            this.spherical = values;
        }

        tmp = czmlInterval.unitCartesian;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartesian3(tmp[i], tmp[i + 1], tmp[i + 2], true));
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
                sphericals[i].push(CoordinateConversions.cartesian3ToSpherical(cartesians[i]));
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
                cartesians[i].push(CoordinateConversions.sphericalToCartesian3(sphericals[i]));
            }
        }
        return cartesians;
    };

    function DynamicDirectionsProperty() {
        this._propertyIntervals = new TimeIntervalCollection();
    }

    DynamicDirectionsProperty.processCzmlPacket = function(parentObject, propertyName, czmlIntervals, constrainedInterval, dynamicObjectCollection) {
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

        existingProperty.addIntervals(czmlIntervals, dynamicObjectCollection, constrainedInterval);

        return newProperty;
    };

    DynamicDirectionsProperty.prototype.addIntervals = function(czmlIntervals, dynamicObjectCollection, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], dynamicObjectCollection, constrainedInterval);
            }
        } else {
            this.addInterval(czmlIntervals, dynamicObjectCollection, constrainedInterval);
        }
    };

    DynamicDirectionsProperty.prototype.addInterval = function(czmlInterval, dynamicObjectCollection, constrainedInterval) {
        var iso8601Interval = czmlInterval.interval;
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

        //If not, create it.
        if (typeof existingInterval === 'undefined') {
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        var references = czmlInterval.references;
        if (typeof references === 'undefined') {
            existingInterval.data = new PositionHolder(czmlInterval);
        } else {
            var properties = [];
            properties.dynamicObjectCollection = dynamicObjectCollection;
            for ( var i = 0, len = references.length; i < len; i++) {
                properties.push(ReferenceProperty.fromString(dynamicObjectCollection, references[i]));
            }
            existingInterval.data = properties;
        }
    };

    //CZML_TODO: Caching and existing instace.
    DynamicDirectionsProperty.prototype.getValueSpherical = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var intervalData = interval.data;
        if (Array.isArray(intervalData)) {
            var result = [];
            for ( var i = 0, len = intervalData.length; i < len; i++) {
                var value = intervalData[i].getValueSpherical(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
                }
            }
            return result;
        }

        return intervalData.getValueSpherical();

    };

    DynamicDirectionsProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var intervalData = interval.data;
        if (Array.isArray(intervalData)) {
            var result = [];
            for ( var i = 0, len = intervalData.length; i < len; i++) {
                var value = intervalData[i].getValueCartesian(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
                }
            }
            return result;
        }

        return intervalData.getValueCartesian();
    };

    return DynamicDirectionsProperty;
});