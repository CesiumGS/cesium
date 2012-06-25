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

    var potentialMaterials = [DynamicColorMaterial, DynamicImageMaterial];

    /**
     * A dynamic property which stores data for multiple types of materials
     * associated with the same property over time. Rather than creating instances
     * of this object directly, it's typically created and managed via loading CZML
     * data into a DynamicObjectCollection.
     *
     * @name DynamicMaterialProperty
     * @internalconstructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     */
    function DynamicMaterialProperty() {
        this._intervals = new TimeIntervalCollection();
    }


    /**
     * Processes the provided CZML interval and creates or modifies a DynamicMaterialProperty
     * of the provided property name and value type on the parent object.
     *
     * @memberof DynamicMaterialProperty
     *
     * @param {Object} parentObject The object that contains or will contain the DynamicMaterialProperty to be created or modified.
     * @param {String} propertyName The name of the property to be created or modified.
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     * @returns true if the property was newly created, false otherwise.
     */
    DynamicMaterialProperty.processCzmlPacket = function(parentObject, propertyName, czmlIntervals, constrainedInterval) {
        var existingProperty = parentObject[propertyName];
        var propertyUpdated = typeof czmlIntervals !== 'undefined';
        if (propertyUpdated) {
            if (typeof existingProperty === 'undefined') {
                existingProperty = new DynamicMaterialProperty();
                parentObject[propertyName] = existingProperty;
            }
            existingProperty._addCzmlIntervals(czmlIntervals, constrainedInterval);
        }
        return propertyUpdated;
    };

    //CZML_TODO What to do about scene property?  Do we really need to pass it here?

    /**
     * Returns the value of the property at the specified time.
     * @memberof DynamicMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Scene} [scene] The scene in which the material exists.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns The modified result parameter or a new instance if the result parameter was not supplied.
     */
    DynamicMaterialProperty.prototype.getValue = function(time, scene, existingMaterial) {
        var value = this._intervals.findIntervalContainingDate(time);
        var material = typeof value !== 'undefined' ? value.data : undefined;
        if (typeof material !== 'undefined') {
            return material.getValue(time, scene, existingMaterial);
        }
        return existingMaterial;
    };

    DynamicMaterialProperty.prototype._addCzmlIntervals = function(czmlIntervals, constrainedInterval) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], constrainedInterval);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, constrainedInterval);
        }
    };

    DynamicMaterialProperty.prototype._addCzmlInterval = function(czmlInterval, constrainedInterval) {
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
            for ( var i = 0, len = potentialMaterials.length; i < len; i++) {
                material = potentialMaterials[i];
                foundMaterial = material.isMaterial(czmlInterval);
                if (foundMaterial) {
                    break;
                }
            }
        }

        //We could handle the data, add it to the property.
        if (foundMaterial) {
            existingInterval.data = material.processCzmlPacket(czmlInterval, existingInterval.data);
        }
    };

    return DynamicMaterialProperty;
});