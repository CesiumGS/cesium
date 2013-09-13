/*global define*/
define(['../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        './createObservableProperty'
    ], function(
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        TimeInterval,
        createObservableProperty) {
    "use strict";

    var reservedPropertyNames = ['cachedAvailabilityDate', 'cachedAvailabilityValue', 'id', 'propertyChanged', //
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

        this._propertyChanged = new Event();
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
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
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
         * @memberof DynamicObject.prototype
         * @type {TimeInterval}
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
                    this._propertyChanged.raiseEvent(this, 'availability', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the position.
         * @memberof DynamicObject.prototype
         * @type {PositionProperty}
         */
        position : {
            get : function() {
                return this._position;
            },
            set : function(value) {
                var oldValue = this._position;
                if (value !== oldValue) {
                    this._position = value;
                    this._propertyChanged.raiseEvent(this, 'position', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the orientation.
         * @memberof DynamicObject.prototype
         * @type {Property}
         */
        orientation : {
            get : function() {
                return this._orientation;
            },
            set : function(value) {
                var oldValue = this._orientation;
                if (value !== oldValue) {
                    this._orientation = value;
                    this._propertyChanged.raiseEvent(this, 'orientation', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the suggested initial offset for viewing this object
         * with the camera.  The offset is defined in the east-north-up reference frame.
         * @memberof DynamicObject.prototype
         * @type {Cartesian3}
         */
        viewFrom : {
            get : function() {
                return this._viewFrom;
            },
            set : function(value) {
                var oldValue = this._viewFrom;
                if (value !== oldValue) {
                    this._viewFrom = value;
                    this._propertyChanged.raiseEvent(this, 'viewFrom', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the billboard.
         * @memberof DynamicObject.prototype
         * @type {DynamicBillboard}
         */
        billboard : createObservableProperty('billboard', '_billboard'),
        /**
         * Gets or sets the cone.
         * @memberof DynamicObject.prototype
         * @type {DynamicCone}
         */
        cone : createObservableProperty('cone', '_cone'),

        /**
         * Gets or sets the ellipsoid.
         * @memberof DynamicObject.prototype
         * @type {DynamicEllipsoid}
         */
        ellipsoid : createObservableProperty('ellipsoid', '_ellipsoid'),
        /**
         * Gets or sets the ellipse.
         * @memberof DynamicObject.prototype
         * @type {DynamicEllipse}
         */
        ellipse : createObservableProperty('ellipse', '_ellipse'),
        /**
         * Gets or sets the label.
         * @memberof DynamicObject.prototype
         * @type {DynamicLabel}
         */
        label : createObservableProperty('label', '_label'),
        /**
         * Gets or sets the path.
         * @memberof DynamicObject.prototype
         * @type {DynamicPath}
         */
        path : createObservableProperty('path', '_path'),
        /**
         * Gets or sets the point graphic.
         * @memberof DynamicObject.prototype
         * @type {DynamicPoint}
         */
        point : createObservableProperty('point', '_point'),
        /**
         * Gets or sets the polygon.
         * @memberof DynamicObject.prototype
         * @type {DynamicPolygon}
         */
        polygon : createObservableProperty('polygon', '_polygon'),
        /**
         * Gets or sets the polyline.
         * @memberof DynamicObject.prototype
         * @type {DynamicPolyline}
         */
        polyline : createObservableProperty('polyline', '_polyline'),
        /**
         * Gets or sets the pyramid.
         * @memberof DynamicObject.prototype
         * @type {DynamicPyramid}
         */
        pyramid : createObservableProperty('pyramid', '_pyramid'),
        /**
         * Gets or sets the vertex positions.
         * @memberof DynamicObject.prototype
         * @type {Property}
         */
        vertexPositions : createObservableProperty('vertexPositions', '_vertexPositions'),
        /**
         * Gets or sets the vector.
         * @memberof DynamicObject.prototype
         * @type {DynamicVector}
         */
        vector : createObservableProperty('vector', '_vector')
    });

    /**
     * Given a time, returns true if this object should have data during that time.
     * @memberof DynamicObject
     *
     * @param {JulianDate} time The time to check availability for.
     * @exception {DeveloperError} time is required.
     * @returns true if the object should have data during the provided time, false otherwise.
     */
    DynamicObject.prototype.isAvailable = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        var availability = this._availability;
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
     * Adds a property to this object.  Once a property is added, it can be
     * observed with {@link DynamicObject.propertyChanged} and composited
     * with {@link CompositeDynamicObjectCollection}
     * @memberof DynamicObject
     *
     * @param propertyName The name of the property to add.
     *
     * @exception {DeveloperError} propertyName is required.
     * @exception {DeveloperError} "propertyName" is a reserved property name.
     * @exception {DeveloperError} "propertyName" is already a registered property.
     */
    DynamicObject.prototype.addProperty = function(propertyName) {
        if (!defined(propertyName)) {
            throw new DeveloperError('propertyName is required.');
        }

        var propertyNames = this._propertyNames;
        if (propertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError(propertyName + ' is a reserved property name.');
        }
        if (reservedPropertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError(propertyName + ' is already a registered property.');
        }

        propertyNames.push(propertyName);

        Object.defineProperty(this, propertyName, createObservableProperty(propertyName, '_' + propertyName));
    };

    /**
     * Removed a property previously added with addProperty.
     * @memberof DynamicObject
     *
     * @param propertyName The name of the property to remove.
     *
     * @exception {DeveloperError} propertyName is required.
     * @exception {DeveloperError} "propertyName" is a reserved property name.
     * @exception {DeveloperError} "propertyName" is not a registered property.
     */
    DynamicObject.prototype.removeProperty = function(propertyName) {
        if (!defined(propertyName)) {
            throw new DeveloperError('propertyName is required.');
        }

        var propertyNames = this._propertyNames;
        if (reservedPropertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError(propertyName + ' is a reserved property name.');
        }
        if (propertyNames.indexOf(propertyName) === -1) {
            throw new DeveloperError(propertyName + ' is not a registered property.');
        }

        this._propertyNames.push(propertyName);
        delete this[propertyName];
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicObject
     *
     * @param {DynamicObject} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicObject.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.availability = defaultValue(source.availability, this.availability);

        var propertyNames = this._propertyNames;
        var propertyNamesLength = propertyNames.length;
        for ( var i = 0; i < propertyNamesLength; i++) {
            var name = propertyNames[i];
            //TODO Remove this once availability is refactored.
            if (name !== 'availability') {
                var targetProperty = this[name];
                var sourceProperty = source[name];
                if (defined(sourceProperty)) {
                    if (defined(targetProperty)) {
                        if (defined(targetProperty.merge)) {
                            targetProperty.merge(sourceProperty);
                        }
                    } else if (defined(sourceProperty.merge) && defined(sourceProperty.clone)) {
                        this[name] = sourceProperty.clone();
                    } else {
                        this[name] = sourceProperty;
                    }
                }
            }
        }
    };

    /**
     * @private
     */
    DynamicObject.prototype.clean = function() {
        var propertyNames = this._propertyNames;
        var propertyNamesLength = propertyNames.length;
        for ( var i = 0; i < propertyNamesLength; i++) {
            this[propertyNames[i]] = undefined;
        }
    };

    return DynamicObject;
});