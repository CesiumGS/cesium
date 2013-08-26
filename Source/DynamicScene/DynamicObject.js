/*global define*/
define([
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/TimeInterval'
    ], function(
        createGuid,
        defaultValue,
        defined,
        DeveloperError,
        JulianDate,
        TimeInterval) {
    "use strict";

    /**
     * DynamicObject instances are the primary data store for processed data.
     * They are used primarily by the visualizers to create and maintain graphic
     * primitives that represent the DynamicObject's properties at a specific time.
     * @alias DynamicObject
     * @constructor
     *
     * @param {Object} [id] A unique identifier for this object.  If no id is provided, a GUID is generated.
     *
     * @see Property
     * @see DynamicObjectCollection
     */
    var DynamicObject = function(id) {
        this._cachedAvailabilityDate = undefined;
        this._cachedAvailabilityValue = undefined;

        if (!defined(id)) {
            id = createGuid();
        }

        /**
         * A unique id associated with this object.
         */
        this.id = id;

        /**
         * The availability TimeInterval, if any, associated with this object.
         * If availability is undefined, it is assumed that this object's
         * other properties will return valid data for any provided time.
         * If availability exists, the objects other properties will only
         * provide valid data if queried within the given interval.
         * @type {TimeInterval}
         * @default undefined
         */
        this.availability = undefined;

        /**
         * Gets or sets the position.
         * @type {PositionProperty}
         * @default undefined
         */
        this.position = undefined;

        /**
         * Gets or sets the orientation.
         * @type {Property}
         * @default undefined
         */
        this.orientation = undefined;

        /**
         * Gets or sets the billboard.
         * @type {DynamicBillboard}
         * @default undefined
         */
        this.billboard = undefined;

        /**
         * Gets or sets the cone.
         * @type {DynamicCone}
         * @default undefined
         */
        this.cone = undefined;

        /**
         * Gets or sets the ellipsoid.
         * @type {DynamicEllipsoid}
         * @default undefined
         */
        this.ellipsoid = undefined;

        /**
         * Gets or sets the ellipse.
         * @type {DynamicEllipse}
         * @default undefined
         */
        this.ellipse = undefined;

        /**
         * Gets or sets the label.
         * @type {DynamicLabel}
         * @default undefined
         */
        this.label = undefined;

        /**
         * Gets or sets the path.
         * @type {DynamicPath}
         * @default undefined
         */
        this.path = undefined;

        /**
         * Gets or sets the point graphic.
         * @type {DynamicPoint}
         * @default undefined
         */
        this.point = undefined;

        /**
         * Gets or sets the polygon.
         * @type {DynamicPolygon}
         * @default undefined
         */
        this.polygon = undefined;

        /**
         * Gets or sets the polyline.
         * @type {DynamicPolyline}
         * @default undefined
         */
        this.polyline = undefined;

        /**
         * Gets or sets the pyramid.
         * @type {DynamicPyramid}
         * @default undefined
         */
        this.pyramid = undefined;

        /**
         * Gets or sets the vertex positions.
         * @type {Property}
         * @default undefined
         */
        this.vertexPositions = undefined;

        /**
         * Gets or sets the vector.
         * @type {DynamicVector}
         * @default undefined
         */
        this.vector = undefined;

        /**
         * Gets or sets the suggested initial offset for viewing this object
         * with the camera.  The offset is defined in the east-north-up reference frame.
         * @type {Cartesian3}
         * @default undefined
         */
        this.viewFrom = undefined;
    };

    /**
     * Given a time, returns true if this object should have data during that time.
     * @param {JulianDate} time The time to check availability for.
     * @exception {DeveloperError} time is required.
     * @returns true if the object should have data during the provided time, false otherwise.
     */
    DynamicObject.prototype.isAvailable = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        var availability = this.availability;
        if (!defined(availability)) {
            return true;
        }

        if (JulianDate.equals(this._cachedAvailabilityDate, time)) {
            return this._cachedAvailabilityValue;
        }

        var availabilityValue = availability.contains(time);
        this._cachedAvailabilityDate = JulianDate.clone(time, this._cachedAvailabilityDate);
        this._cachedAvailabilityValue = availabilityValue;

        return availabilityValue;
    };

    /**
     * Merge all of the properties of the supplied object onto this object.
     * Properties which are already defined are not overwritten.
     * @param other {DynamicObject} The object to merge.
     * @private
     */
    DynamicObject.prototype.merge = function(other) {
        if (!defined(other)) {
            throw new DeveloperError('other is required');
        }
        for ( var property in other) {
            if (other.hasOwnProperty(property)) {
                this[property] = defaultValue(this[property], other[property]);
            }
        }
    };

    /**
     * Given two DynamicObjects, takes the position, orientation, vertexPositions and availability
     * properties from the second and assigns them to the first, assuming such properties did not
     * already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicObject.mergeProperties = function(targetObject, objectToMerge) {
        targetObject.position = defaultValue(targetObject.position, objectToMerge.position);
        targetObject.orientation = defaultValue(targetObject.orientation, objectToMerge.orientation);
        targetObject.vertexPositions = defaultValue(targetObject.vertexPositions, objectToMerge.vertexPositions);
        targetObject.viewFrom = defaultValue(targetObject.viewFrom, objectToMerge.viewFrom);
        var availability = objectToMerge.availability;
        if (defined(availability)) {
            targetObject._setAvailability(availability);
        }
    };

    /**
     * Given a DynamicObject, undefines the position, orientation, vertexPositions and availability
     * associated with it. This method is not normally called directly, but is part of the array of
     * CZML processing functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the billboard from.
     */
    DynamicObject.undefineProperties = function(dynamicObject) {
        dynamicObject.position = undefined;
        dynamicObject.orientation = undefined;
        dynamicObject.vertexPositions = undefined;
        dynamicObject.viewFrom = undefined;
        dynamicObject._setAvailability(undefined);
    };

    DynamicObject.prototype._setAvailability = function(availability) {
        var changed = !TimeInterval.equals(this.availability, availability);

        this.availability = availability;

        this._cachedAvailabilityDate = undefined;
        this._cachedAvailabilityValue = undefined;

        return changed;
    };

    return DynamicObject;
});
