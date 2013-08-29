/*global define*/
define([
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        '../Core/TimeInterval'
    ], function(
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
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

        this._id = id;
        this._availability = undefined;
        this._position = undefined;
        this._orientation = undefined;
        this._billboard = undefined;
        this._cone = undefined;
        this._ellipsoid = undefined;
        this._ellipse = undefined;
        this._label = undefined;
        this._path = undefined;
        this._point = undefined;
        this._polygon = undefined;
        this._polyline = undefined;
        this._pyramid = undefined;
        this._vertexPositions = undefined;
        this._vector = undefined;
        this._viewFrom = undefined;
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicObject.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicObject.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },
        /**
         * Gets the unique ID associated with this object.
         * @memberof DynamicObject.prototype
         * @type {Object}
         */
        id : {
            get : function() {
                return this._id;
            }
        },
        /**
         * The availability TimeInterval, if any, associated with this object.
         * If availability is undefined, it is assumed that this object's
         * other properties will return valid data for any provided time.
         * If availability exists, the objects other properties will only
         * provide valid data if queried within the given interval.
         * @type {TimeInterval}
         * @default undefined
         */
        availability : {
            get : function() {
                return this._availability;
            },
            set : function(value) {
                if (!defined(value) || !value.equals(this._availability)) {
                    this._cachedAvailabilityDate = undefined;
                    this._cachedAvailabilityValue = undefined;

                    var oldValue = this._availability;
                    this._availability = value;
                    this._propertyAssigned.raiseEvent(this, 'availability', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the position.
         * @type {PositionProperty}
         * @default undefined
         */
        position : {
            get : function() {
                return this._position;
            },
            set : function(value) {
                var oldValue = this._position;
                this._position = value;
                this._propertyAssigned.raiseEvent(this, 'position', value, oldValue);
            }
        },
        /**
         * Gets or sets the orientation.
         * @type {Property}
         * @default undefined
         */
        orientation : {
            get : function() {
                return this._orientation;
            },
            set : function(value) {
                var oldValue = this._orientation;
                this._orientation = value;
                this._propertyAssigned.raiseEvent(this, 'orientation', value, oldValue);
            }
        },
        /**
         * Gets or sets the billboard.
         * @type {DynamicBillboard}
         * @default undefined
         */
        billboard : {
            get : function() {
                return this._billboard;
            },
            set : function(value) {
                var oldValue = this._billboard;
                this._billboard = value;
                if (defined(oldValue)) {
                    oldValue.propertyAssigned.removeEventListener(DynamicObject.prototype._billboardListener, this);
                }
                if (defined(value)) {
                    value.propertyAssigned.addEventListener(DynamicObject.prototype._billboardListener, this);
                }
                this._propertyAssigned.raiseEvent(this, 'billboard', value, oldValue);
            }
        },
        /**
         * Gets or sets the cone.
         * @type {DynamicCone}
         * @default undefined
         */
        cone : {
            get : function() {
                return this._cone;
            },
            set : function(value) {
                var oldValue = this._cone;
                this._cone = value;
                this._propertyAssigned.raiseEvent(this, 'cone', value, oldValue);
            }
        },

        /**
         * Gets or sets the ellipsoid.
         * @type {DynamicEllipsoid}
         * @default undefined
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            },
            set : function(value) {
                var oldValue = this._ellipsoid;
                this._ellipsoid = value;
                this._propertyAssigned.raiseEvent(this, 'ellipsoid', value, oldValue);
            }
        },
        ellipse : {
            get : function() {
                return this._ellipse;
            },
            set : function(value) {
                var oldValue = this._ellipse;
                this._ellipse = value;
                this._propertyAssigned.raiseEvent(this, 'ellipse', value, oldValue);
            }
        },
        /**
         * Gets or sets the label.
         * @type {DynamicLabel}
         * @default undefined
         */
        label : {
            get : function() {
                return this._label;
            },
            set : function(value) {
                var oldValue = this._label;
                this._label = value;
                this._propertyAssigned.raiseEvent(this, 'label', value, oldValue);
            }
        },
        /**
         * Gets or sets the path.
         * @type {DynamicPath}
         * @default undefined
         */
        path : {
            get : function() {
                return this._path;
            },
            set : function(value) {
                var oldValue = this._path;
                this._path = value;
                this._propertyAssigned.raiseEvent(this, 'path', value, oldValue);
            }
        },
        /**
         * Gets or sets the point graphic.
         * @type {DynamicPoint}
         * @default undefined
         */
        point : {
            get : function() {
                return this._point;
            },
            set : function(value) {
                var oldValue = this._point;
                this._point = value;
                this._propertyAssigned.raiseEvent(this, 'point', value, oldValue);
            }
        },
        /**
         * Gets or sets the polygon.
         * @type {DynamicPolygon}
         * @default undefined
         */
        polygon : {
            get : function() {
                return this._polygon;
            },
            set : function(value) {
                var oldValue = this._polygon;
                this._polygon = value;
                this._propertyAssigned.raiseEvent(this, 'polygon', value, oldValue);
            }
        },
        /**
         * Gets or sets the polyline.
         * @type {DynamicPolyline}
         * @default undefined
         */
        polyline : {
            get : function() {
                return this._polyline;
            },
            set : function(value) {
                var oldValue = this._polyline;
                this._polyline = value;
                this._propertyAssigned.raiseEvent(this, 'polyline', value, oldValue);
            }
        },
        /**
         * Gets or sets the pyramid.
         * @type {DynamicPyramid}
         * @default undefined
         */
        pyramid : {
            get : function() {
                return this._pyramid;
            },
            set : function(value) {
                var oldValue = this._pyramid;
                this._pyramid = value;
                this._propertyAssigned.raiseEvent(this, 'pyramid', value, oldValue);
            }
        },
        /**
         * Gets or sets the vertex positions.
         * @type {Property}
         * @default undefined
         */
        vertexPositions : {
            get : function() {
                return this._vertexPositions;
            },
            set : function(value) {
                var oldValue = this._vertexPositions;
                this._vertexPositions = value;
                this._propertyAssigned.raiseEvent(this, 'vertexPositions', value, oldValue);
            }
        },
        /**
         * Gets or sets the vector.
         * @type {DynamicVector}
         * @default undefined
         */
        vector : {
            get : function() {
                return this._vector;
            },
            set : function(value) {
                var oldValue = this._vector;
                this._vector = value;
                this._propertyAssigned.raiseEvent(this, 'vector', value, oldValue);
            }
        },
        /**
         * Gets or sets the suggested initial offset for viewing this object
         * with the camera.  The offset is defined in the east-north-up reference frame.
         * @type {Cartesian3}
         * @default undefined
         */
        viewFrom : {
            get : function() {
                return this._viewFrom;
            },
            set : function(value) {
                var oldValue = this._viewFrom;
                this._viewFrom = value;
                this._propertyAssigned.raiseEvent(this, 'viewFrom', value, oldValue);
            }
        }
    });

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
            targetObject.availability = availability;
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
        dynamicObject.availability = undefined;
    };

    DynamicObject.prototype._billboardListener = function(billboard, propertyName, value, oldValue) {
        this._propertyAssigned.raiseEvent(billboard, propertyName, value, oldValue);
    };
    return DynamicObject;
});
