/*global define*/
define([
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * Entity instances are the primary data store for processed data.
     * They are used primarily by the visualizers to create and maintain graphic
     * primitives that represent the Entity's properties at a specific time.
     * @alias Entity
     * @constructor
     *
     * @param {String} [id] A unique identifier for this object.  If no id is provided, a GUID is generated.
     *
     * @see Property
     * @see EntityCollection
     */
    var Entity = function(id) {
        if (!defined(id)) {
            id = createGuid();
        }

        this._availability = undefined;
        this._id = id;
        this._definitionChanged = new Event();
        this._name = undefined;
        this._parent = undefined;
        this._propertyNames = ['billboard', 'description', 'ellipse', 'ellipsoid', 'label', 'model', //
                               'orientation', 'path', 'point', 'polygon', 'polyline', 'position', //
                               'rectangle', 'viewFrom', 'wall'];

        this._billboard = undefined;
        this._billboardSubscription = undefined;
        this._description = undefined;
        this._descriptionSubscription = undefined;
        this._ellipse = undefined;
        this._ellipseSubscription = undefined;
        this._ellipsoid = undefined;
        this._ellipsoidSubscription = undefined;
        this._label = undefined;
        this._labelSubscription = undefined;
        this._model = undefined;
        this._modelSubscription = undefined;
        this._orientation = undefined;
        this._orientationSubscription = undefined;
        this._path = undefined;
        this._pathSubscription = undefined;
        this._point = undefined;
        this._pointSubscription = undefined;
        this._polygon = undefined;
        this._polygonSubscription = undefined;
        this._polyline = undefined;
        this._polylineSubscription = undefined;
        this._position = undefined;
        this._positionSubscription = undefined;
        this._rectangle = undefined;
        this._rectangleSubscription = undefined;
        this._viewFrom = undefined;
        this._viewFromSubscription = undefined;
        this._wall = undefined;
        this._wallSubscription = undefined;
    };

    defineProperties(Entity.prototype, {
        /**
         * The availability, if any, associated with this object.
         * If availability is undefined, it is assumed that this object's
         * other properties will return valid data for any provided time.
         * If availability exists, the objects other properties will only
         * provide valid data if queried within the given interval.
         * @memberof Entity.prototype
         * @type {TimeIntervalCollection}
         */
        availability : createPropertyDescriptor('availability'),
        /**
         * Gets the unique ID associated with this object.
         * @memberof Entity.prototype
         * @type {String}
         */
        id : {
            get : function() {
                return this._id;
            }
        },
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof Entity.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets or sets the name of the object.  The name is intended for end-user
         * consumption and does not need to be unique.
         * @memberof Entity.prototype
         * @type {String}
         */
        name : {
            configurable : false,
            get : function() {
                return this._name;
            },
            set : function(value) {
                var oldValue = this._name;
                if (oldValue !== value) {
                    this._name = value;
                    this._definitionChanged.raiseEvent(this, 'name', value, oldValue);
                }
            }
        },
        /**
         * Gets or sets the parent object.
         * @memberof Entity.prototype
         * @type {Entity}
         */
        parent : createPropertyDescriptor('parent'),
        /**
         * Gets the names of all properties registed on this instance.
         * @memberof Entity.prototype
         * @type {Event}
         */
        propertyNames : {
            get : function() {
                return this._propertyNames;
            }
        },
        /**
         * Gets or sets the billboard.
         * @memberof Entity.prototype
         * @type {BillboardGraphics}
         */
        billboard : createPropertyDescriptor('billboard'),
        /**
         * Gets or sets the description.
         * @memberof Entity.prototype
         * @type {Property}
         */
        description : createPropertyDescriptor('description'),
        /**
         * Gets or sets the ellipse.
         * @memberof Entity.prototype
         * @type {EllipseGraphics}
         */
        ellipse : createPropertyDescriptor('ellipse'),
        /**
         * Gets or sets the ellipsoid.
         * @memberof Entity.prototype
         * @type {EllipsoidGraphics}
         */
        ellipsoid : createPropertyDescriptor('ellipsoid'),
        /**
         * Gets or sets the label.
         * @memberof Entity.prototype
         * @type {LabelGraphics}
         */
        label : createPropertyDescriptor('label'),
        /**
         * Gets or sets the model.
         * @memberof Entity.prototype
         * @type {LabelGraphics}
         */
        model : createPropertyDescriptor('model'),
        /**
         * Gets or sets the orientation.
         * @memberof Entity.prototype
         * @type {Property}
         */
        orientation : createPropertyDescriptor('orientation'),
        /**
         * Gets or sets the path.
         * @memberof Entity.prototype
         * @type {PathGraphics}
         */
        path : createPropertyDescriptor('path'),
        /**
         * Gets or sets the point graphic.
         * @memberof Entity.prototype
         * @type {PointGraphics}
         */
        point : createPropertyDescriptor('point'),
        /**
         * Gets or sets the polygon.
         * @memberof Entity.prototype
         * @type {PolygonGraphics}
         */
        polygon : createPropertyDescriptor('polygon'),
        /**
         * Gets or sets the polyline.
         * @memberof Entity.prototype
         * @type {PolylineGraphics}
         */
        polyline : createPropertyDescriptor('polyline'),
        /**
         * Gets or sets the position.
         * @memberof Entity.prototype
         * @type {PositionProperty}
         */
        position : createPropertyDescriptor('position'),
        /**
         * Gets or sets the rectangle.
         * @memberof Entity.prototype
         * @type {RectangleGraphics}
         */
        rectangle : createPropertyDescriptor('rectangle'),
        /**
         * Gets or sets the suggested initial offset for viewing this object
         * with the camera.  The offset is defined in the east-north-up reference frame.
         * @memberof Entity.prototype
         * @type {Cartesian3}
         */
        viewFrom : createPropertyDescriptor('viewFrom'),
        /**
         * Gets or sets the wall.
         * @memberof Entity.prototype
         * @type {WallGraphics}
         */
        wall : createPropertyDescriptor('wall')
    });

    /**
     * Given a time, returns true if this object should have data during that time.
     *
     * @param {JulianDate} time The time to check availability for.
     * @returns true if the object should have data during the provided time, false otherwise.
     */
    Entity.prototype.isAvailable = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var availability = this._availability;
        return !defined(availability) || availability.contains(time);
    };

    /**
     * Adds a property to this object.  Once a property is added, it can be
     * observed with {@link Entity#definitionChanged} and composited
     * with {@link CompositeEntityCollection}
     *
     * @param {String} propertyName The name of the property to add.
     *
     * @exception {DeveloperError} "propertyName" is a reserved property name.
     * @exception {DeveloperError} "propertyName" is already a registered property.
     */
    Entity.prototype.addProperty = function(propertyName) {
        var propertyNames = this._propertyNames;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(propertyName)) {
            throw new DeveloperError('propertyName is required.');
        }
        if (propertyNames.indexOf(propertyName) !== -1) {
            throw new DeveloperError(propertyName + ' is already a registered property.');
        }
        if (propertyName in this) {
            throw new DeveloperError(propertyName + ' is a reserved property name.');
        }
        //>>includeEnd('debug');

        propertyNames.push(propertyName);
        Object.defineProperty(this, propertyName, createPropertyDescriptor(propertyName, true));
    };

    /**
     * Removed a property previously added with addProperty.
     *
     * @param {String} propertyName The name of the property to remove.
     *
     * @exception {DeveloperError} "propertyName" is a reserved property name.
     * @exception {DeveloperError} "propertyName" is not a registered property.
     */
    Entity.prototype.removeProperty = function(propertyName) {
        var propertyNames = this._propertyNames;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(propertyName)) {
            throw new DeveloperError('propertyName is required.');
        }
        if (propertyNames.indexOf(propertyName) === -1) {
            throw new DeveloperError(propertyName + ' is not a registered property.');
        }
        //>>includeEnd('debug');

        this._propertyNames.push(propertyName);
        delete this[propertyName];
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {Entity} source The object to be merged into this object.
     */
    Entity.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        //Name and availability are not Property objects and are currently handled differently.
        this.name = defaultValue(this.name, source.name);
        this.availability = defaultValue(source.availability, this.availability);

        var propertyNames = this._propertyNames;
        var propertyNamesLength = propertyNames.length;
        for (var i = 0; i < propertyNamesLength; i++) {
            var name = propertyNames[i];
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
    };

    return Entity;
});
