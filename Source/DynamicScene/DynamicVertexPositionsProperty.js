/*global define*/
define([
        '../Core/defined',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Iso8601',
        '../Core/Ellipsoid',
        './ReferenceProperty'
    ], function(
        defined,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Cartographic,
        Iso8601,
        Ellipsoid,
        ReferenceProperty) {
    "use strict";

    var wgs84 = Ellipsoid.WGS84;

    function ValueHolder(czmlInterval) {
        var i, len, values = [], tmp;

        tmp = czmlInterval.cartesian;
        if (defined(tmp)) {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartesian3(tmp[i], tmp[i + 1], tmp[i + 2]));
            }
            this.cartesian = values;
        } else {
            tmp = czmlInterval.cartographicRadians;
            if (defined(tmp)) {
                for (i = 0, len = tmp.length; i < len; i += 3) {
                    values.push(new Cartographic(tmp[i], tmp[i + 1], tmp[i + 2]));
                }
                this.cartographic = values;
            } else {
                tmp = czmlInterval.cartographicDegrees;
                if (defined(tmp)) {
                    for (i = 0, len = tmp.length; i < len; i += 3) {
                        values.push(Cartographic.fromDegrees(tmp[i], tmp[i + 1], tmp[i + 2]));
                    }
                    this.cartographic = values;
                }
            }
        }
    }

    ValueHolder.prototype.getValue = function() {
        if (!defined(this.cartesian)) {
            this.cartesian = wgs84.cartographicArrayToCartesianArray(this.cartographic);
        }
        return this.cartesian;
    };

    /**
     * @private
     */
    var DynamicVertexPositionsProperty = function() {
        this._propertyIntervals = new TimeIntervalCollection();
    };

    DynamicVertexPositionsProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval, dynamicObjectCollection) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], constrainedInterval, dynamicObjectCollection);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, constrainedInterval, dynamicObjectCollection);
        }
    };

    DynamicVertexPositionsProperty.prototype.getValue = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (!defined(interval)) {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var value = interval_data[i].getValue(time);
                if (defined(value)) {
                    result.push(value);
                }
            }
            return result;
        }

        return interval_data.getValue();
    };

    DynamicVertexPositionsProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval, dynamicObjectCollection) {
        var iso8601Interval = czmlInterval.interval;
        if (!defined(iso8601Interval)) {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (defined(constrainedInterval)) {
            iso8601Interval = iso8601Interval.intersect(constrainedInterval);
        }

        //See if we already have data at that interval.
        var thisIntervals = this._propertyIntervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        //If not, create it.
        if (!defined(existingInterval)) {
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        var references = czmlInterval.references;
        if (!defined(references)) {
            existingInterval.data = new ValueHolder(czmlInterval);
        } else {
            var properties = [];
            for ( var i = 0, len = references.length; i < len; i++) {
                properties.push(ReferenceProperty.fromString(dynamicObjectCollection, references[i]));
            }
            existingInterval.data = properties;
        }
    };

    return DynamicVertexPositionsProperty;
});
