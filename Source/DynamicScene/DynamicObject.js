/*global define*/
define([
        '../Core/createGuid',
        '../Core/DeveloperError',
        '../Core/TimeInterval',
        './DynamicProperty',
        './DynamicPositionProperty',
        './DynamicVertexPositionsProperty',
        './CzmlUnitQuaternion'
    ], function(
        createGuid,
        DeveloperError,
        TimeInterval,
        DynamicProperty,
        DynamicPositionProperty,
        DynamicVertexPositionsProperty,
        CzmlUnitQuaternion) {
    "use strict";

    /**
     * DynamicObject instances are the primary data store for processed CZML data.
     * They are used primarily by the visualizers to create and maintain graphic
     * primitives that represent the DynamicObject's properties at a specific time.
     *
     * @param {Object} [id] A unique identifier for this object.  If no id is provided, a GUID is generated.
     *
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see DynamicVertexiPositionsProperty
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboard
     * @see DynamicCone
     * @see DynamicLabel
     * @see DynamicPoint
     * @see DynamicPolygon
     * @see DynamicPolyline
     * @see DynamicPyramid
     */
    function DynamicObject(id) {
        this._cachedAvailabilityDate = undefined;
        this._cachedAvailabilityValue = undefined;

        /**
         * A unique id associated with this object.
         */
        this.id = id || createGuid();

        //Add standard CZML properties.  Even though they won't all be used
        //for each object, having the superset explicitly listed here will allow the
        //compiler to optimize this class.  It also allows us to document them.
        //Any changes to this list should coincide with changes to CzmlDefaults.updaters

        /**
         * The availability TimeInterval, if any, associated with this object.
         * If availability is undefined, it is assumed that this object's
         * other properties will return valid data for any provided time.
         * If availability exists, the objects other properties will only
         * provide valid data if queried within the given interval.
         */
        this.availability = undefined;

        /**
         * The DynamicPositionProperty, if any, associated with this object.
         */
        this.position = undefined;

        /**
         * The DynamicProperty with value type CzmlUnitQuaternion, if any, associated with this object.
         */
        this.orientation = undefined;

        /**
         * The DynamicBillboard, if any, associated with this object.
         */
        this.billboard = undefined;

        /**
         * The DynamicCone, if any, associated with this object.
         */
        this.cone = undefined;

        /**
         * The DynamicLabel, if any, associated with this object.
         */
        this.label = undefined;

        /**
         * The DynamicPoint, if any, associated with this object.
         */
        this.point = undefined;

        /**
         * The DynamicPolygon, if any, associated with this object.
         */
        this.polygon = undefined;

        /**
         * The DynamicPolyline, if any, associated with this object.
         */
        this.polyline = undefined;

        /**
         * The DynamicPyramid, if any, associated with this object.
         */
        this.pyramid = undefined;

        /**
         * The DynamicVertexPositionsProperty, if any, associated with this object.
         */
        this.vertexPositions = undefined;
    }

    /**
     * Given a time, returns true if this object should have data during that time.
     * @param {JulianDate} time The time to check availability for.
     * @exception {DeveloperError} time is required.
     * @returns true if the object should have data during the provided time, false otherwise.
     */
    DynamicObject.prototype.isAvailable = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }
        if (typeof this.availability === 'undefined') {
            return true;
        }
        if (this._cachedAvailabilityDate === time) {
            return this._cachedAvailabilityValue;
        }
        this._cachedAvailabilityDate = time;
        return this._cachedAvailabilityValue = this.availability.contains(time);
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's position
     * property. This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the position data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if the property was newly created while processing the packet, false otherwise.
     *
     * @see DynamicPositionProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicObject.processCzmlPacketPosition = function(dynamicObject, packet) {
        var positionData = packet.position;
        if (typeof positionData === 'undefined') {
            return false;
        }

        var position = dynamicObject.position;
        var propertyCreated = typeof position === 'undefined';
        if (propertyCreated) {
            dynamicObject.position = position = new DynamicPositionProperty();
        }
        position.processCzmlIntervals(positionData);
        return propertyCreated;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's orientation
     * property. This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the orientation data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if the property was newly created while processing the packet, false otherwise.
     *
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicObject.processCzmlPacketOrientation = function(dynamicObject, packet) {
        var orientationData = packet.orientation;
        if (typeof orientationData === 'undefined') {
            return false;
        }

        var orientation = dynamicObject.orientation;
        var propertyCreated = typeof orientation === 'undefined';
        if (propertyCreated) {
            dynamicObject.orientation = orientation = new DynamicProperty(CzmlUnitQuaternion);
        }
        orientation.processCzmlIntervals(orientationData);
        return propertyCreated;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's vertexPositions
     * property. This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the vertexPositions data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to use to resolve any CZML properly links.
     * @returns {Boolean} true if the property was newly created while processing the packet, false otherwise.
     *
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicObject.processCzmlPacketVertexPositions = function(dynamicObject, packet, dynamicObjectCollection) {
        var vertexPositionsData = packet.vertexPositions;
        if (typeof vertexPositionsData === 'undefined') {
            return false;
        }

        var vertexPositions = dynamicObject.vertexPositions;
        var propertyCreated = typeof dynamicObject.vertexPositions === 'undefined';
        if (propertyCreated) {
            dynamicObject.vertexPositions = vertexPositions = new DynamicVertexPositionsProperty();
        }
        vertexPositions.processCzmlIntervals(vertexPositionsData, undefined, dynamicObjectCollection);
        return propertyCreated;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's availability
     * property. This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the availability data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if the property was newly created while processing the packet, false otherwise.
     *
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicObject.processCzmlPacketAvailability = function(dynamicObject, packet) {
        var availability = packet.availability;
        if (typeof availability === 'undefined') {
            return false;
        }

        var propertyCreated = false;
        var interval = TimeInterval.fromIso8601(availability);
        if (typeof interval !== 'undefined') {
            propertyCreated = typeof dynamicObject.availability === 'undefined';
            dynamicObject._setAvailability(interval);
        }
        return propertyCreated;
    };


    /**
     * Given two DynamicObjects, takes the position, orientation, vertexPositions and availability
     * properties from the second and assigns them to the first, assuming such properties did not
     * already exist. This method is not normally called directly, but is part of the array of CZML
     * processing functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicObject.mergeProperties = function(targetObject, objectToMerge) {
        targetObject.position = targetObject.position || objectToMerge.position;
        targetObject.orientation = targetObject.orientation || objectToMerge.orientation;
        targetObject.vertexPositions = targetObject.vertexPositions || objectToMerge.vertexPositions;
        targetObject._setAvailability(targetObject.availability || objectToMerge.availability);
    };

    /**
     * Given a DynamicObject, undefines the position, orientation, vertexPositions and availability
     * associated with it. This method is not normally called directly, but is part of the array of
     * CZML processing functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the billboard from.
     *
     * @see CzmlDefaults
     */
    DynamicObject.undefineProperties = function(dynamicObject) {
        dynamicObject.position = undefined;
        dynamicObject.orientation = undefined;
        dynamicObject.vertexPositions = undefined;
        dynamicObject._setAvailability(undefined);
    };

    DynamicObject.prototype._setAvailability = function(availability) {
        this.availability = availability;
        this._cachedAvailabilityDate = undefined;
        this._cachedAvailabilityValue = undefined;
    };

    return DynamicObject;
});