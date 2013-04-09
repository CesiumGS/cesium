/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Iso8601',
        './DynamicColorMaterial',
        './DynamicImageMaterial',
        './DynamicGridMaterial'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Iso8601,
        DynamicColorMaterial,
        DynamicImageMaterial,
        DynamicGridMaterial) {
    "use strict";

    var potentialMaterials = [DynamicColorMaterial, DynamicImageMaterial, DynamicGridMaterial];

    /**
     * A dynamic property which stores data for multiple types of materials
     * associated with the same property over time. Rather than creating instances
     * of this object directly, it's typically created and managed via loading CZML
     * data into a DynamicObjectCollection.
     *
     * @alias DynamicMaterialProperty
     * @internalconstructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     */
    var DynamicMaterialProperty = function() {
        this._intervals = new TimeIntervalCollection();
    };


    /**
     * Processes the provided CZML interval or intervals into this property.
     * @memberof DynamicMaterialProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     */
    DynamicMaterialProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval, sourceUri) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], constrainedInterval, sourceUri);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, constrainedInterval, sourceUri);
        }
    };

    /**
     * Returns the value of the property at the specified time.
     * @memberof DynamicMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Context} [context] The context in which the material exists.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns The modified result parameter or a new instance if the result parameter was not supplied.
     */
    DynamicMaterialProperty.prototype.getValue = function(time, context, existingMaterial) {
        var value = this._intervals.findIntervalContainingDate(time);
        var material = typeof value !== 'undefined' ? value.data : undefined;
        if (typeof material !== 'undefined') {
            return material.getValue(time, context, existingMaterial);
        }
        return existingMaterial;
    };

    DynamicMaterialProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval, sourceUri) {
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
        var thisIntervals = this._intervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);
        var foundMaterial = false;
        var existingMaterial;

        if (typeof existingInterval !== 'undefined') {
            //We have an interval, but we need to make sure the
            //new data is the same type of material as the old data.
            existingMaterial = existingInterval.data;
            foundMaterial = existingMaterial.isMaterial(czmlInterval);
        } else {
            //If not, create it.
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        //If the new data was a different type, look for a handler for this type.
        if (foundMaterial === false) {
            for ( var i = 0, len = potentialMaterials.length; i < len; i++) {
                var PotentialMaterial = potentialMaterials[i];
                foundMaterial = PotentialMaterial.isMaterial(czmlInterval);
                if (foundMaterial) {
                    existingInterval.data = existingMaterial = new PotentialMaterial();
                    break;
                }
            }
        }

        //We could handle the data, prcess it.
        if (foundMaterial) {
            existingMaterial.processCzmlIntervals(czmlInterval, sourceUri);
        }
    };

    return DynamicMaterialProperty;
});