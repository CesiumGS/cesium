/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        './DynamicColorMaterial'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        DynamicColorMaterial) {
    "use strict";

    function DynamicMaterialProperty() {
        this._intervals = new TimeIntervalCollection();
        this._potentialMaterials = [DynamicColorMaterial];
    }

    DynamicMaterialProperty.createOrUpdate = function(czmlIntervals, buffer, sourceUri, existingProperty, constrainedInterval) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicMaterialProperty();
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri, constrainedInterval);

        return existingProperty;
    };

    DynamicMaterialProperty.prototype.getValue = function(time) {
        return this._intervals.findIntervalContainingDate(time).data;
    };

    DynamicMaterialProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri, constrainedInterval);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri, constrainedInterval);
        }
    };

    DynamicMaterialProperty.prototype.applyToMaterial = function(time, existingMaterial) {
        var material = this.getValue(time);
        if (typeof material !== 'undefined') {
            return material.applyToMaterial(time, existingMaterial);
        }
    };

    DynamicMaterialProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri, constrainedInterval) {
        var iso8601Interval = czmlInterval.interval, property, material;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = TimeInterval.INFINITE.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.insersect(constrainedInterval);
        }

        //See if we already have data at that interval.
        var this_intervals = this._intervals;
        var existingInterval = this_intervals.findInterval(iso8601Interval.start, iso8601Interval.stop);
        var foundMaterial = false;

        if (typeof existingInterval !== 'undefined') {
            //If so, see if the new data is the same type.
            property = existingInterval.data;
            if (typeof property !== 'undefined') {
                material = property.material;
                foundMaterial = material.isMaterial(czmlInterval);
            }
        } else {
            //If not, create it.
            existingInterval = iso8601Interval;
            this_intervals.addInterval(existingInterval);
        }

        //If the new data was a different type, unwrapping fails, look for a handler for this type.
        if (foundMaterial === false) {
            for ( var i = 0, len = this._potentialMaterials.length; i < len; i++) {
                material = this._potentialMaterials[i];
                foundMaterial = material.isMaterial(czmlInterval);
                if (foundMaterial) {
                    break;
                }
            }
        }

        //We could handle the data, add it to the property.
        if (foundMaterial) {
            existingInterval.data = material.createOrUpdate(czmlInterval, buffer, sourceUri, existingInterval.data);
        }
    };

    return DynamicMaterialProperty;
});