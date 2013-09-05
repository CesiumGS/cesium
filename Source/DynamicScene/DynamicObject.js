/*global define*/
define(['../Core/createGuid',
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

    function createProperty(propertyName, privatePropertyName) {
        var subPropertyAssigned = function(property, subPropertyName, newValue, oldValue) {
            this._subpropertyAssigned.raiseEvent(this, propertyName, property, subPropertyName, newValue, oldValue);
        };

        return {
            get : function() {
                return this[privatePropertyName];
            },
            set : function(value) {
                var oldValue = this[privatePropertyName];
                if (value !== oldValue) {
                    if (defined(oldValue) && defined(oldValue.propertyAssigned)) {
                        oldValue.propertyAssigned.removeEventListener(subPropertyAssigned, this);
                    }
                    this[privatePropertyName] = value;
                    if (defined(value) && defined(value.propertyAssigned)) {
                        value.propertyAssigned.addEventListener(subPropertyAssigned, this);
                    }
                    this._propertyAssigned.raiseEvent(this, propertyName, value, oldValue);
                }
            }
        };
    }

    var reservedPropertyNames = ['cachedAvailabilityDate', 'cachedAvailabilityValue', 'id', 'propertyAssigned', //
                                 'propertyNames', 'isAvailable', 'clean', 'merge', 'addProperty', 'removeProperty'];

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
        this._propertyAssigned = new Event();
        this._subpropertyAssigned = new Event();
        this._propertyNames = ['availability', 'position', 'orientation', 'billboard', //
                               'cone', 'ellipsoid', 'ellipse', 'label', 'path', 'point', 'polygon', //
                               'polyline', 'pyramid', 'vertexPositions', 'vector', 'viewFrom'];
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
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicObject.prototype
         * @type {Event}
         */
        subpropertyAssigned : {
            get : function() {
                return this._subpropertyAssigned;
            }
        },
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicObject.prototype
         * @type {Event}
         */
        propertyNames : {
            get : function() {
                return this._propertyNames;
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
                if (value !== oldValue) {
                    this._position = value;
                    this._propertyAssigned.raiseEvent(this, 'position', value, oldValue);
                }
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
                if (value !== oldValue) {
                    this._orientation = value;
                    this._propertyAssigned.raiseEvent(this, 'orientation', value, oldValue);
                }
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
                if (value !== oldValue) {
                    this._viewFrom = value;
                    this._propertyAssigned.raiseEvent(this, 'viewFrom', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the billboard.
         * @type {DynamicBillboard}
         * @default undefined
         */
        billboard : createProperty('billboard', '_billboard'),
        /**
         * Gets or sets the cone.
         * @type {DynamicCone}
         * @default undefined
         */
        cone : createProperty('cone', '_cone'),

        /**
         * Gets or sets the ellipsoid.
         * @type {DynamicEllipsoid}
         * @default undefined
         */
        ellipsoid : createProperty('ellipsoid', '_ellipsoid'),
        /**
         * Gets or sets the ellipse.
         * @type {DynamicEllipse}
         * @default undefined
         */
        ellipse : createProperty('ellipse', '_ellipse'),
        /**
         * Gets or sets the label.
         * @type {DynamicLabel}
         * @default undefined
         */
        label : createProperty('label', '_label'),
        /**
         * Gets or sets the path.
         * @type {DynamicPath}
         * @default undefined
         */
        path : createProperty('path', '_path'),
        /**
         * Gets or sets the point graphic.
         * @type {DynamicPoint}
         * @default undefined
         */
        point : createProperty('point', '_point'),
        /**
         * Gets or sets the polygon.
         * @type {DynamicPolygon}
         * @default undefined
         */
        polygon : createProperty('polygon', '_polygon'),
        /**
         * Gets or sets the polyline.
         * @type {DynamicPolyline}
         * @default undefined
         */
        polyline : createProperty('polyline', '_polyline'),
        /**
         * Gets or sets the pyramid.
         * @type {DynamicPyramid}
         * @default undefined
         */
        pyramid : createProperty('pyramid', '_pyramid'),
        /**
         * Gets or sets the vertex positions.
         * @type {Property}
         * @default undefined
         */
        vertexPositions : createProperty('vertexPositions', '_vertexPositions'),
        /**
         * Gets or sets the vector.
         * @type {DynamicVector}
         * @default undefined
         */
        vector : createProperty('vector', '_vector')
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

    DynamicObject.prototype.addProperty = function(propertyName) {
        var propertyNames = this._propertyNames;
        if (propertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError();
        }
        if (reservedPropertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError();

        }

        propertyNames.push(propertyName);

        Object.defineProperty(this, propertyName, createProperty(propertyName));
    };

    DynamicObject.prototype._onSubPropertyAssigned = function(property, propertyName, newValue, oldValue) {
        this._subpropertyAssigned.raiseEvent(this, property, propertyName, newValue, oldValue);
    };

    DynamicObject.prototype.removeProperty = function(propertyName) {
        var propertyNames = this._propertyNames;
        if (reservedPropertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError();
        }
        if (propertyNames.indexOf(propertyName) === -1) {
            throw new DeveloperError();
        }

        this._propertyNames.push(propertyName);
        delete this[propertyName];
    };

    DynamicObject.prototype.merge = function(objectToMerge) {
        this.availability = defaultValue(objectToMerge.availability, this.availability);

        var propertyNames = this._propertyNames;
        var propertyNamesLength = propertyNames.length;
        for ( var i = 0; i < propertyNamesLength; i++) {
            var name = propertyNames[i];
            //TODO Remove this once availability is refactored.
            if (name !== 'availability') {
                var target = this[name];
                var source = objectToMerge[name];
                if (defined(target)) {
                    if (typeof target.merge === 'function' && defined(source)) {
                        target.merge(source);
                    }
                } else {
                    this[name] = source;
                }
            }
        }
    };

    DynamicObject.prototype.clean = function() {
        var propertyNames = this._propertyNames;
        var propertyNamesLength = propertyNames.length;
        for ( var i = 0; i < propertyNamesLength; i++) {
            this[propertyNames[i]] = undefined;
        }
    };

    return DynamicObject;
});