/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Cartographic3',
        '../Core/Math',
        '../Core/Ellipsoid',
        './DynamicPositionProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Cartographic3,
        CesiumMath,
        Ellipsoid,
        DynamicPositionProperty) {
    "use strict";

    var wgs84 = Ellipsoid.getWgs84();

    function PositionHolder(czmlInterval) {
        var i, len, values = [], tmp;

        tmp = czmlInterval.cartographicRadians;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartographic3(tmp[i], tmp[i + 1], tmp[i + 2]));
            }
            this.cartographic = values;
        }

        tmp = czmlInterval.cartographicDegrees;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartographic3(CesiumMath.toRadians(tmp[i]), CesiumMath.toRadians(tmp[i + 1]), CesiumMath.toRadians(tmp[i + 2])));
            }
            this.cartographic = values;
        }

        tmp = czmlInterval.cartesian;
        if (typeof tmp !== 'undefined') {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartesian3(tmp[i], tmp[i + 1], tmp[i + 2]));
            }
            this.cartesian = values;
        }
    }

    PositionHolder.prototype.getValueCartographic = function() {
        if (typeof this.cartographic === 'undefined') {
            this.cartographic = wgs84.toCartographic3s(this.cartesian);
        }
        return this.cartographic;
    };

    PositionHolder.prototype.getValueCartesian = function() {
        if (typeof this.cartesian === 'undefined') {
            this.cartesian = wgs84.toCartesians(this.cartographic);
        }
        return this.cartesian;
    };

    function DynamicVertexPositionsProperty() {
        this._propertyIntervals = new TimeIntervalCollection();
    }

    DynamicVertexPositionsProperty.createOrUpdate = function(czmlIntervals, buffer, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicVertexPositionsProperty();
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri);

        return existingProperty;
    };

    DynamicVertexPositionsProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri);
        }
    };

    DynamicVertexPositionsProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri) {
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
            for ( var i = 0, len = objects.length; i < len; i++) {
                properties.push(objects[i]);
            }
            existingInterval.data = properties;
        }
    };

    DynamicVertexPositionsProperty.prototype.getValueCartographic = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            return undefined;
        }

        return interval_data.getValueCartographic();
    };

    DynamicVertexPositionsProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            return undefined;
        }

        return interval_data.getValueCartesian();
    };

    return DynamicVertexPositionsProperty;
});