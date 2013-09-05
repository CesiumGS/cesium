/*global define*/
define([
        '../Core/defined',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/Iso8601'
    ], function(
        defined,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Spherical,
        Iso8601) {
    "use strict";

    function ValueHolder(czmlInterval) {
        var i;
        var len;
        var values = [];
        var tmp = czmlInterval.unitSpherical;
        if (defined(tmp)) {
            for (i = 0, len = tmp.length; i < len; i += 2) {
                values.push(new Spherical(tmp[i], tmp[i + 1]));
            }
            this.spherical = values;
        }

        tmp = czmlInterval.unitCartesian;
        if (defined(tmp)) {
            for (i = 0, len = tmp.length; i < len; i += 3) {
                values.push(new Cartesian3(tmp[i], tmp[i + 1], tmp[i + 2], true));
            }
            this.cartesian = values;
        }
    }

    ValueHolder.prototype.getValue = function() {
        var sphericals = this.spherical;
        if (!defined(sphericals)) {
            sphericals = [];
            this.spherical = sphericals;
            var cartesians = this.cartesian;
            for ( var i = 0, len = cartesians.length; i < len; i++) {
                sphericals.push(Spherical.fromCartesian3(cartesians[i]));
            }
        }
        return sphericals;
    };

    /**
     * @private
     */
    var DynamicDirectionsProperty = function() {
        this._propertyIntervals = new TimeIntervalCollection();
    };

    DynamicDirectionsProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval, dynamicObjectCollection) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                addCzmlInterval(this, czmlIntervals[i], constrainedInterval, dynamicObjectCollection);
            }
        } else {
            addCzmlInterval(this, czmlIntervals, constrainedInterval, dynamicObjectCollection);
        }
    };

    DynamicDirectionsProperty.prototype.getValue = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (!defined(interval)) {
            return undefined;
        }
        return interval.data.getValue();
    };

    function addCzmlInterval(dynamicDirectionsProperty, czmlInterval, constrainedInterval, dynamicObjectCollection) {
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
        var thisIntervals = dynamicDirectionsProperty._propertyIntervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        //If not, create it.
        if (!defined(existingInterval)) {
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        existingInterval.data = new ValueHolder(czmlInterval);
    }

    return DynamicDirectionsProperty;
});
