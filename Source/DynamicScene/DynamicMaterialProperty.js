/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Iso8601',
        './DynamicColorMaterial',
        './DynamicImageMaterial'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Iso8601,
        DynamicColorMaterial,
        DynamicImageMaterial) {
    "use strict";

    function DynamicMaterialProperty() {
        this._intervals = new TimeIntervalCollection();
        this._potentialMaterials = [DynamicColorMaterial, DynamicImageMaterial];
    }

    DynamicMaterialProperty.processCzmlPacket = function(parentObject, propertyName, czmlIntervals, constrainedInterval) {
        var existingProperty = parentObject[propertyName];
        var propertyUpdated = typeof czmlIntervals !== 'undefined';
        if (propertyUpdated) {
            if (typeof existingProperty === 'undefined') {
                existingProperty = new DynamicMaterialProperty();
                parentObject[propertyName] = existingProperty;
            }
            existingProperty.addIntervals(czmlIntervals, constrainedInterval);
        }
        return propertyUpdated;
    };

    DynamicMaterialProperty.prototype.getValue = function(time) {
        var value = this._intervals.findIntervalContainingDate(time);
        return typeof value !== 'undefined' ? value.data : undefined;
    };

    DynamicMaterialProperty.prototype.applyToMaterial = function(time, scene, existingMaterial) {
        var material = this.getValue(time);
        if (typeof material !== 'undefined') {
            return material.applyToMaterial(time, scene, existingMaterial);
        }
        return existingMaterial;
    };

    DynamicMaterialProperty.prototype.addIntervals = function(czmlIntervals, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this.addInterval(czmlIntervals[i], constrainedInterval);
            }
        } else {
            this.addInterval(czmlIntervals, constrainedInterval);
        }
    };

    DynamicMaterialProperty.prototype.addInterval = function(czmlInterval, constrainedInterval) {
        var iso8601Interval = czmlInterval.interval, property, material;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        if (typeof constrainedInterval !== 'undefined') {
            iso8601Interval = iso8601Interval.intersect(constrainedInterval);
        }

        //See if we already have data at that interval.
        var thisIntervals = this._intervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);
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
            thisIntervals.addInterval(existingInterval);
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
            existingInterval.data = material.processCzmlPacket(czmlInterval, existingInterval.data, constrainedInterval);
        }
    };

    return DynamicMaterialProperty;
});