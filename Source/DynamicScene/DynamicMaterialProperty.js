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

    DynamicMaterialProperty.processCzmlPacket = function(parentObject, propertyName, czmlIntervals, constrainedInterval, dynamicObjectCollection) {
        var newProperty = false;
        var existingProperty = parentObject[propertyName];
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicMaterialProperty();
            parentObject[propertyName] = existingProperty;
            newProperty = true;
        }

        existingProperty.addIntervals(czmlIntervals, dynamicObjectCollection, constrainedInterval);

        return newProperty;
    };

    DynamicMaterialProperty.prototype.getValue = function(time) {
        var value = this._intervals.findIntervalContainingDate(time);
        if (typeof value !== 'undefined') {
            return value.data;
        }
        return undefined;
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

    DynamicMaterialProperty.prototype.applyToMaterial = function(time, existingMaterial, scene) {
        var material = this.getValue(time);
        if (typeof material !== 'undefined') {
            return material.applyToMaterial(time, existingMaterial, scene);
        }
        return existingMaterial;
    };

    DynamicMaterialProperty.prototype.addInterval = function(czmlInterval, buffer, sourceUri, constrainedInterval) {
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
            existingInterval.data = material.processCzmlPacket(czmlInterval, buffer, existingInterval.data);
        }
    };

    return DynamicMaterialProperty;
});