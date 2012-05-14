/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection) {
    "use strict";

    function DynamicMaterialProperty(potentialMaterials) {
        this._intervals = new TimeIntervalCollection();
        this._potentialMaterials = potentialMaterials;
    }

    DynamicMaterialProperty.createOrUpdate = function(czmlIntervals, potentialMaterials, buffer, sourceUri, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicMaterialProperty(potentialMaterials);
        }

        existingProperty.addIntervals(czmlIntervals, buffer, sourceUri);

        return existingProperty;
    };

    DynamicMaterialProperty.prototype.getValue = function(time) {
        return this._intervals.findIntervalContainingDate(time);
    };

    DynamicMaterialProperty.prototype.addIntervals = function(czmlIntervals, buffer, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], buffer, sourceUri);
            }
        } else {
            this.addInterval(czmlIntervals, buffer, sourceUri);
        }
    };

    DynamicMaterialProperty.prototype.applyToMaterial = function(time, existingMaterial) {
        var material = this.getValue(time);
        if (typeof material !== 'undefined') {
            return material.applyToMaterial(time, existingMaterial);
        }
    };

    DynamicMaterialProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri) {
        //Parse the interval
        var iso8601Interval = czmlInterval.interval, intervalStart, intervalStop, property, material;
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
        var this_intervals = this._intervals;
        var existingInterval = this_intervals.findInterval(intervalStart, intervalStop);
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
            existingInterval = new TimeInterval(intervalStart, intervalStop, true, true);
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

        //We could handle the data, add it to the propery.
        if (foundMaterial) {
            existingInterval.data = material.createOrUpdate(czmlInterval, buffer, sourceUri, existingInterval.data);
        }
    };

    return DynamicMaterialProperty;
});