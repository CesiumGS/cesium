/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Transforms',
        './BillboardGraphics',
        './BoxGraphics',
        './ConstantPositionProperty',
        './CorridorGraphics',
        './createPropertyDescriptor',
        './createRawPropertyDescriptor',
        './CylinderGraphics',
        './EllipseGraphics',
        './EllipsoidGraphics',
        './LabelGraphics',
        './ModelGraphics',
        './PathGraphics',
        './PointGraphics',
        './PolygonGraphics',
        './PolylineGraphics',
        './PolylineVolumeGraphics',
        './Property',
        './RectangleGraphics',
        './WallGraphics'
    ], function(
        Cartesian3,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Event,
        Matrix3,
        Matrix4,
        Quaternion,
        Transforms,
        BillboardGraphics,
        BoxGraphics,
        ConstantPositionProperty,
        CorridorGraphics,
        createPropertyDescriptor,
        createRawPropertyDescriptor,
        CylinderGraphics,
        EllipseGraphics,
        EllipsoidGraphics,
        LabelGraphics,
        ModelGraphics,
        PathGraphics,
        PointGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PolylineVolumeGraphics,
        Property,
        RectangleGraphics,
        WallGraphics) {
    "use strict";

    function createConstantPositionProperty(value) {
        return new ConstantPositionProperty(value);
    }

    function createPositionPropertyDescriptor(name) {
        return createPropertyDescriptor(name, undefined, createConstantPositionProperty);
    }

    function createPropertyTypeDescriptor(name, Type) {
        return createPropertyDescriptor(name, undefined, function(value) {
            if (value instanceof Type) {
                return value;
            }
            return new Type(value);
        });
    }

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
    var Entity = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var id = options.id;
        if (typeof options === 'string') {
            deprecationWarning('Entity', 'The Entity constructor taking a string was deprecated in Cesium 1.5.  It will be removed in 1.7.  Use "new Entity({ id : \'id\'})" instead.');
            id = options;
            options = defaultValue.EMPTY_OBJECT;
        }

        if (!defined(id)) {
            id = createGuid();
        }

        this._availability = undefined;
        this._id = id;
        this._definitionChanged = new Event();
        this._name = undefined;
        this._parent = undefined;
        this._propertyNames = ['billboard', 'box', 'corridor', 'cylinder', 'description', 'ellipse', //
                               'ellipsoid', 'label', 'model', 'orientation', 'path', 'point', 'polygon', //
                               'polyline', 'polylineVolume', 'position', 'rectangle', 'viewFrom', 'wall'];

        this._billboard = undefined;
        this._billboardSubscription = undefined;
        this._box = undefined;
        this._boxSubscription = undefined;
        this._corridor = undefined;
        this._corridorSubscription = undefined;
        this._cylinder = undefined;
        this._cylinderSubscription = undefined;
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
        this._polylineVolume = undefined;
        this._polylineVolumeSubscription = undefined;
        this._position = undefined;
        this._positionSubscription = undefined;
        this._rectangle = undefined;
        this._rectangleSubscription = undefined;
        this._viewFrom = undefined;
        this._viewFromSubscription = undefined;
        this._wall = undefined;
        this._wallSubscription = undefined;

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
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
        availability : createRawPropertyDescriptor('availability'),
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
        parent : createRawPropertyDescriptor('parent'),
        /**
         * Gets the names of all properties registered on this instance.
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
        billboard : createPropertyTypeDescriptor('billboard', BillboardGraphics),
        /**
         * Gets or sets the box.
         * @memberof Entity.prototype
         * @type {BoxGraphics}
         */
        box : createPropertyTypeDescriptor('box', BoxGraphics),
        /**
         * Gets or sets the corridor.
         * @memberof Entity.prototype
         * @type {CorridorGraphics}
         */
        corridor : createPropertyTypeDescriptor('corridor', CorridorGraphics),
        /**
         * Gets or sets the cylinder.
         * @memberof Entity.prototype
         * @type {CylinderGraphics}
         */
        cylinder : createPropertyTypeDescriptor('cylinder', CylinderGraphics),
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
        ellipse : createPropertyTypeDescriptor('ellipse', EllipseGraphics),
        /**
         * Gets or sets the ellipsoid.
         * @memberof Entity.prototype
         * @type {EllipsoidGraphics}
         */
        ellipsoid : createPropertyTypeDescriptor('ellipsoid', EllipsoidGraphics),
        /**
         * Gets or sets the label.
         * @memberof Entity.prototype
         * @type {LabelGraphics}
         */
        label : createPropertyTypeDescriptor('label', LabelGraphics),
        /**
         * Gets or sets the model.
         * @memberof Entity.prototype
         * @type {LabelGraphics}
         */
        model : createPropertyTypeDescriptor('model', ModelGraphics),
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
        path : createPropertyTypeDescriptor('path', PathGraphics),
        /**
         * Gets or sets the point graphic.
         * @memberof Entity.prototype
         * @type {PointGraphics}
         */
        point : createPropertyTypeDescriptor('point', PointGraphics),
        /**
         * Gets or sets the polygon.
         * @memberof Entity.prototype
         * @type {PolygonGraphics}
         */
        polygon : createPropertyTypeDescriptor('polygon', PolygonGraphics),
        /**
         * Gets or sets the polyline.
         * @memberof Entity.prototype
         * @type {PolylineGraphics}
         */
        polyline : createPropertyTypeDescriptor('polyline', PolylineGraphics),
        /**
         * Gets or sets the polyline volume.
         * @memberof Entity.prototype
         * @type {PolylineGraphics}
         */
        polylineVolume : createPropertyTypeDescriptor('polylineVolume', PolylineVolumeGraphics),
        /**
         * Gets or sets the position.
         * @memberof Entity.prototype
         * @type {PositionProperty}
         */
        position : createPositionPropertyDescriptor('position'),
        /**
         * Gets or sets the rectangle.
         * @memberof Entity.prototype
         * @type {RectangleGraphics}
         */
        rectangle : createPropertyTypeDescriptor('rectangle', RectangleGraphics),
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
        wall : createPropertyTypeDescriptor('wall', WallGraphics)
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
        Object.defineProperty(this, propertyName, createRawPropertyDescriptor(propertyName, true));
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
        var sourcePropertyNames = defined(source._propertyNames) ? source._propertyNames : Object.keys(source);
        var propertyNamesLength = sourcePropertyNames.length;
        for (var i = 0; i < propertyNamesLength; i++) {
            var name = sourcePropertyNames[i];
            var targetProperty = this[name];
            var sourceProperty = source[name];

            //Custom properties that are registered on the source entity must also
            //get registered on this entity.
            if (!defined(targetProperty) && propertyNames.indexOf(name) === -1) {
                this.addProperty(name);
            }

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

    var matrix3Scratch = new Matrix3();
    var positionScratch = new Cartesian3();
    var orientationScratch = new Quaternion();

    /**
     * @private
     */
    Entity.prototype._getModelMatrix = function(time, result) {
        var position = Property.getValueOrUndefined(this._position, time, positionScratch);
        if (!defined(position)) {
            return undefined;
        }
        var orientation = Property.getValueOrUndefined(this._orientation, time, orientationScratch);
        if (!defined(orientation)) {
            result = Transforms.eastNorthUpToFixedFrame(position, undefined, result);
        } else {
            result = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, result);
        }
        return result;
    };

    return Entity;
});
