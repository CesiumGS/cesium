/*global define*/
define([
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/Cartesian3',
        '../Core/Cartographic3',
        '../Core/Math',
        '../Core/Iso8601',
        '../Core/Ellipsoid',
        './ReferenceProperty',
        './DynamicPositionProperty'
    ], function(
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Cartesian3,
        Cartographic3,
        CesiumMath,
        Iso8601,
        Ellipsoid,
        ReferenceProperty,
        DynamicPositionProperty) {
    "use strict";

    var wgs84 = Ellipsoid.WGS84;

    function ValueHolder(czmlInterval) {
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

    ValueHolder.prototype.getValueCartographic = function() {
        if (typeof this.cartographic === 'undefined') {
            this.cartographic = wgs84.toCartographic3s(this.cartesian);
        }
        return this.cartographic;
    };

    ValueHolder.prototype.getValueCartesian = function() {
        if (typeof this.cartesian === 'undefined') {
            this.cartesian = wgs84.toCartesians(this.cartographic);
        }
        return this.cartesian;
    };

    /**
     * A dynamic property which maintains an array of positions that can change over time.
     * The positions can be represented as both Cartesian and Cartographic coordinates.
     * Rather than creating instances of this object directly, it's typically
     * created and managed via loading CZML data into a DynamicObjectCollection.
     * Instances of this type are exposed via DynamicObject and it's sub-objects
     * and are responsible for interpreting and interpolating the data for visualization.
     * </p>
     *
     * @name DynamicDirectionsProperty
     * @internalconstructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see ReferenceProperty
     * @see DynamicMaterialProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     */
    function DynamicVertexPositionsProperty() {
        this._propertyIntervals = new TimeIntervalCollection();
    }

    /**
     * Processes the provided CZML interval and creates or modifies a DynamicVertexPositionsProperty
     * of the provided property name and value type on the parent object.
     *
     * @memberof DynamicVertexPositionsProperty
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {DynamicObjectCollection} dynamicObjectCollection CZML_TODO
     * @param {DynamicVertexPositionsProperty} [existingProperty] The existing property to modify, if undefined a new instance will be created.
     * @returns The existingProperty parameter or a new instance if existingProperty was undefined.
     */
    DynamicVertexPositionsProperty.processCzmlPacket = function(czmlIntervals, dynamicObjectCollection, existingProperty) {
        if (typeof czmlIntervals === 'undefined') {
            return existingProperty;
        }

        //At this point we will definitely have a value, so if one doesn't exist, create it.
        if (typeof existingProperty === 'undefined') {
            existingProperty = new DynamicVertexPositionsProperty();
        }

        existingProperty._addCzmlIntervals(czmlIntervals, dynamicObjectCollection);

        return existingProperty;
    };

    /**
     * Retrieves the values at the supplied time as Cartographic coordinates.
     * @memberof DynamicVertexPositionsProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns An array of Cartographic coordinates for the provided time.
     */
    DynamicVertexPositionsProperty.prototype.getValueCartographic = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var value = interval_data[i].getValueCartographic(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
                }
            }
            return result;
        }

        return interval_data.getValueCartographic();

    };

    /**
     * Retrieves the values at the supplied time as Cartesian coordinates.
     * @memberof DynamicVertexPositionsProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns An array of Cartesian coordinates for the provided time.
     */
    DynamicVertexPositionsProperty.prototype.getValueCartesian = function(time) {
        var interval = this._propertyIntervals.findIntervalContainingDate(time);
        if (typeof interval === 'undefined') {
            return undefined;
        }
        var interval_data = interval.data;
        if (Array.isArray(interval_data)) {
            var result = [];
            for ( var i = 0, len = interval_data.length; i < len; i++) {
                var value = interval_data[i].getValueCartesian(time);
                if (typeof value !== 'undefined') {
                    result.push(value);
                }
            }
            return result;
        }

        return interval_data.getValueCartesian();
    };

    DynamicVertexPositionsProperty.prototype._addCzmlIntervals = function(czmlIntervals, dynamicObjectCollection) {
        if (Array.isArray(czmlIntervals)) {
            for ( var i = 0, len = czmlIntervals.length; i < len; i++) {
                this._addCzmlInterval(czmlIntervals[i], dynamicObjectCollection);
            }
        } else {
            this._addCzmlInterval(czmlIntervals, dynamicObjectCollection);
        }
    };

    DynamicVertexPositionsProperty.prototype._addCzmlInterval = function(czmlInterval, dynamicObjectCollection) {
        var iso8601Interval = czmlInterval.interval;
        if (typeof iso8601Interval === 'undefined') {
            iso8601Interval = Iso8601.MAXIMUM_INTERVAL.clone();
        } else {
            iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
        }

        //See if we already have data at that interval.
        var thisIntervals = this._propertyIntervals;
        var existingInterval = thisIntervals.findInterval(iso8601Interval.start, iso8601Interval.stop);

        //If not, create it.
        if (typeof existingInterval === 'undefined') {
            existingInterval = iso8601Interval;
            thisIntervals.addInterval(existingInterval);
        }

        var references = czmlInterval.references;
        if (typeof references === 'undefined') {
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