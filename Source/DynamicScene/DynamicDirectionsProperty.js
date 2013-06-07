/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Spherical',
        '../Core/Iso8601'
    ], function(
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

    ValueHolder.prototype.getValueSpherical = function() {
        var sphericals = this.spherical;
        if (typeof sphericals === 'undefined') {
            sphericals = [];
            this.spherical = sphericals;
            var cartesians = this.cartesian;
            for ( var i = 0, len = cartesians.length; i < len; i++) {
                sphericals.push(Spherical.fromCartesian3(cartesians[i]));
            }
        }
        return sphericals;
    };

    ValueHolder.prototype.getValueCartesian = function() {
        var cartesians = this.cartesian;
        if (typeof cartesians === 'undefined') {
            cartesians = [];
            this.cartesian = cartesians;
            var sphericals = this.spherical;
            for ( var i = 0, len = sphericals.length; i < len; i++) {
                cartesians.push(Cartesian3.fromSpherical(sphericals[i]));
            }
        }
        return cartesians;
    };

    /**
     * A dynamic property which maintains an array of directions that can change over time.
     * The directions can be represented as both Cartesian and Spherical coordinates.
     * Rather than creating instances of this object directly, it's typically
     * created and managed via loading CZML data into a DynamicObjectCollection.
     * Instances of this type are exposed via DynamicObject and it's sub-objects
     * and are responsible for interpreting and interpolating the data for visualization.
     * </p>
     *
     * @alias DynamicDirectionsProperty
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicMaterialProperty
     * @see DynamicPositionProperty
     * @see DynamicVertexPositionsProperty
     */
    var DynamicDirectionsProperty = function() {
        this._propertyIntervals = new TimeIntervalCollection();
    };

    /**
     * Processes the provided CZML interval or intervals into this property.
     *
     * @memberof DynamicDirectionsProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     * @param {DynamicObjectCollection} dynamicObjectCollection The DynamicObjectCollection to be used as a target for resolving links within this property.
     */
    DynamicDirectionsProperty.prototype.processCzmlIntervals = function(czmlIntervals, constrainedInterval, dynamicObjectCollection) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                addCzmlInterval(this, czmlIntervals[i], constrainedInterval, dynamicObjectCollection);
            }
        } else {
            addCzmlInterval(this, czmlIntervals, constrainedInterval, dynamicObjectCollection);
        }
    };

    /**
     * Retrieves the values at the supplied time as Spherical coordinates.
     * @memberof DynamicDirectionsProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns An array of spherical coordinates for the provided time.
     */
    DynamicDirectionsProperty.prototype.getValueSpherical = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        return interval.data.getValueSpherical();
    };

    /**
     * Retrieves the values at the supplied time as unit cartesian coordinates.
     * @memberof DynamicDirectionsProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns An array of unit cartesian coordinates for the provided time.
     */
    DynamicDirectionsProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        return interval.data.getValueCartesian();
    };

    function addCzmlInterval(dynamicDirectionsProperty, czmlInterval, constrainedInterval, dynamicObjectCollection) {
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
        var thisIntervals = dynamicDirectionsProperty._propertyIntervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        //If not, create it.
        if (typeof existingInterval === 'undefined') {
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        existingInterval.data = new ValueHolder(czmlInterval);
    }

    return DynamicDirectionsProperty;
});