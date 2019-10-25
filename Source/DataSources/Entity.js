import Cartesian3 from '../Core/Cartesian3.js';
import Cartographic from '../Core/Cartographic.js';
import Check from '../Core/Check.js';
import createGuid from '../Core/createGuid.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import CesiumMath from '../Core/Math.js';
import Matrix3 from '../Core/Matrix3.js';
import Matrix4 from '../Core/Matrix4.js';
import Quaternion from '../Core/Quaternion.js';
import Transforms from '../Core/Transforms.js';
import GroundPolylinePrimitive from '../Scene/GroundPolylinePrimitive.js';
import GroundPrimitive from '../Scene/GroundPrimitive.js';
import HeightReference from '../Scene/HeightReference.js';
import BillboardGraphics from './BillboardGraphics.js';
import BoxGraphics from './BoxGraphics.js';
import ConstantPositionProperty from './ConstantPositionProperty.js';
import CorridorGraphics from './CorridorGraphics.js';
import createPropertyDescriptor from './createPropertyDescriptor.js';
import createRawPropertyDescriptor from './createRawPropertyDescriptor.js';
import CylinderGraphics from './CylinderGraphics.js';
import EllipseGraphics from './EllipseGraphics.js';
import EllipsoidGraphics from './EllipsoidGraphics.js';
import LabelGraphics from './LabelGraphics.js';
import ModelGraphics from './ModelGraphics.js';
import PathGraphics from './PathGraphics.js';
import PlaneGraphics from './PlaneGraphics.js';
import PointGraphics from './PointGraphics.js';
import PolygonGraphics from './PolygonGraphics.js';
import PolylineGraphics from './PolylineGraphics.js';
import PolylineVolumeGraphics from './PolylineVolumeGraphics.js';
import Property from './Property.js';
import PropertyBag from './PropertyBag.js';
import RectangleGraphics from './RectangleGraphics.js';
import WallGraphics from './WallGraphics.js';

    var cartoScratch = new Cartographic();

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
     * Entity instances aggregate multiple forms of visualization into a single high-level object.
     * They can be created manually and added to {@link Viewer#entities} or be produced by
     * data sources, such as {@link CzmlDataSource} and {@link GeoJsonDataSource}.
     * @alias Entity
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.id] A unique identifier for this object. If none is provided, a GUID is generated.
     * @param {String} [options.name] A human readable name to display to users. It does not have to be unique.
     * @param {TimeIntervalCollection} [options.availability] The availability, if any, associated with this object.
     * @param {Boolean} [options.show] A boolean value indicating if the entity and its children are displayed.
     * @param {Property} [options.description] A string Property specifying an HTML description for this entity.
     * @param {PositionProperty} [options.position] A Property specifying the entity position.
     * @param {Property} [options.orientation] A Property specifying the entity orientation.
     * @param {Property} [options.viewFrom] A suggested initial offset for viewing this object.
     * @param {Entity} [options.parent] A parent entity to associate with this entity.
     * @param {BillboardGraphics} [options.billboard] A billboard to associate with this entity.
     * @param {BoxGraphics} [options.box] A box to associate with this entity.
     * @param {CorridorGraphics} [options.corridor] A corridor to associate with this entity.
     * @param {CylinderGraphics} [options.cylinder] A cylinder to associate with this entity.
     * @param {EllipseGraphics} [options.ellipse] A ellipse to associate with this entity.
     * @param {EllipsoidGraphics} [options.ellipsoid] A ellipsoid to associate with this entity.
     * @param {LabelGraphics} [options.label] A options.label to associate with this entity.
     * @param {ModelGraphics} [options.model] A model to associate with this entity.
     * @param {PathGraphics} [options.path] A path to associate with this entity.
     * @param {PlaneGraphics} [options.plane] A plane to associate with this entity.
     * @param {PointGraphics} [options.point] A point to associate with this entity.
     * @param {PolygonGraphics} [options.polygon] A polygon to associate with this entity.
     * @param {PolylineGraphics} [options.polyline] A polyline to associate with this entity.
     * @param {PropertyBag} [options.properties] Arbitrary properties to associate with this entity.
     * @param {PolylineVolumeGraphics} [options.polylineVolume] A polylineVolume to associate with this entity.
     * @param {RectangleGraphics} [options.rectangle] A rectangle to associate with this entity.
     * @param {WallGraphics} [options.wall] A wall to associate with this entity.
     *
     * @see {@link https://cesium.com/docs/tutorials/creating-entities/|Creating Entities}
     */
    function Entity(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var id = options.id;
        if (!defined(id)) {
            id = createGuid();
        }

        this._availability = undefined;
        this._id = id;
        this._definitionChanged = new Event();
        this._name = options.name;
        this._show = defaultValue(options.show, true);
        this._parent = undefined;
        this._propertyNames = ['billboard', 'box', 'corridor', 'cylinder', 'description', 'ellipse', //
                               'ellipsoid', 'label', 'model', 'orientation', 'path', 'plane', 'point', 'polygon', //
                               'polyline', 'polylineVolume', 'position', 'properties', 'rectangle', 'viewFrom', 'wall'];

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
        this._plane = undefined;
        this._planeSubscription = undefined;
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
        this._properties = undefined;
        this._propertiesSubscription = undefined;
        this._rectangle = undefined;
        this._rectangleSubscription = undefined;
        this._viewFrom = undefined;
        this._viewFromSubscription = undefined;
        this._wall = undefined;
        this._wallSubscription = undefined;
        this._children = [];

        /**
         * Gets or sets the entity collection that this entity belongs to.
         * @type {EntityCollection}
         */
        this.entityCollection = undefined;

        this.parent = options.parent;
        this.merge(options);
    }

    function updateShow(entity, children, isShowing) {
        var length = children.length;
        for (var i = 0; i < length; i++) {
            var child = children[i];
            var childShow = child._show;
            var oldValue = !isShowing && childShow;
            var newValue = isShowing && childShow;
            if (oldValue !== newValue) {
                updateShow(child, child._children, isShowing);
            }
        }
        entity._definitionChanged.raiseEvent(entity, 'isShowing', isShowing, !isShowing);
    }

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
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
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
        name : createRawPropertyDescriptor('name'),
        /**
         * Gets or sets whether this entity should be displayed. When set to true,
         * the entity is only displayed if the parent entity's show property is also true.
         * @memberof Entity.prototype
         * @type {Boolean}
         */
        show : {
            get : function() {
                return this._show;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (value === this._show) {
                    return;
                }

                var wasShowing = this.isShowing;
                this._show = value;
                var isShowing = this.isShowing;

                if (wasShowing !== isShowing) {
                    updateShow(this, this._children, isShowing);
                }

                this._definitionChanged.raiseEvent(this, 'show', value, !value);
            }
        },
        /**
         * Gets whether this entity is being displayed, taking into account
         * the visibility of any ancestor entities.
         * @memberof Entity.prototype
         * @type {Boolean}
         */
        isShowing : {
            get : function() {
                return this._show && (!defined(this.entityCollection) || this.entityCollection.show) && (!defined(this._parent) || this._parent.isShowing);
            }
        },
        /**
         * Gets or sets the parent object.
         * @memberof Entity.prototype
         * @type {Entity}
         */
        parent : {
            get : function() {
                return this._parent;
            },
            set : function(value) {
                var oldValue = this._parent;

                if (oldValue === value) {
                    return;
                }

                var wasShowing = this.isShowing;
                if (defined(oldValue)) {
                    var index = oldValue._children.indexOf(this);
                    oldValue._children.splice(index, 1);
                }

                this._parent = value;
                if (defined(value)) {
                    value._children.push(this);
                }

                var isShowing = this.isShowing;

                if (wasShowing !== isShowing) {
                    updateShow(this, this._children, isShowing);
                }

                this._definitionChanged.raiseEvent(this, 'parent', value, oldValue);
            }
        },
        /**
         * Gets the names of all properties registered on this instance.
         * @memberof Entity.prototype
         * @type {Array}
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
         * @type {ModelGraphics}
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
         * Gets or sets the plane.
         * @memberof Entity.prototype
         * @type {PlaneGraphics}
         */
        plane : createPropertyTypeDescriptor('plane', PlaneGraphics),
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
         * @type {PolylineVolumeGraphics}
         */
        polylineVolume : createPropertyTypeDescriptor('polylineVolume', PolylineVolumeGraphics),
        /**
         * Gets or sets the bag of arbitrary properties associated with this entity.
         * @memberof Entity.prototype
         * @type {PropertyBag}
         */
        properties : createPropertyTypeDescriptor('properties', PropertyBag),
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
         * Gets or sets the suggested initial offset when tracking this object.
         * The offset is typically defined in the east-north-up reference frame,
         * but may be another frame depending on the object's velocity.
         * @memberof Entity.prototype
         * @type {Property}
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
     * @returns {Boolean} true if the object should have data during the provided time, false otherwise.
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
        var index = propertyNames.indexOf(propertyName);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(propertyName)) {
            throw new DeveloperError('propertyName is required.');
        }
        if (index === -1) {
            throw new DeveloperError(propertyName + ' is not a registered property.');
        }
        //>>includeEnd('debug');

        this._propertyNames.splice(index, 1);
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

        //Name, show, and availability are not Property objects and are currently handled differently.
        //source.show is intentionally ignored because this.show always has a value.
        this.name = defaultValue(this.name, source.name);
        this.availability = defaultValue(this.availability, source.availability);

        var propertyNames = this._propertyNames;
        var sourcePropertyNames = defined(source._propertyNames) ? source._propertyNames : Object.keys(source);
        var propertyNamesLength = sourcePropertyNames.length;
        for (var i = 0; i < propertyNamesLength; i++) {
            var name = sourcePropertyNames[i];

            //Ignore parent when merging, this only happens at construction time.
            if (name === 'parent') {
                continue;
            }

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
     * Computes the model matrix for the entity's transform at specified time. Returns undefined if orientation or position
     * are undefined.
     *
     * @param {JulianDate} time The time to retrieve model matrix for.
     * @param {Matrix4} [result] The object onto which to store the result.
     *
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. Result is undefined if position or orientation are undefined.
     */
    Entity.prototype.computeModelMatrix = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('time', time);
        //>>includeEnd('debug');
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

    /**
     * @private
     */
    Entity.prototype.computeModelMatrixForHeightReference = function(time, heightReferenceProperty, heightOffset, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('time', time);
        //>>includeEnd('debug');
        var heightReference = Property.getValueOrDefault(heightReferenceProperty, time, HeightReference.NONE);
        var position = Property.getValueOrUndefined(this._position, time, positionScratch);
        if (heightReference === HeightReference.NONE || !defined(position) || Cartesian3.equalsEpsilon(position, Cartesian3.ZERO, CesiumMath.EPSILON8)) {
            return this.computeModelMatrix(time, result);
        }

        var carto = ellipsoid.cartesianToCartographic(position, cartoScratch);
        if (heightReference === HeightReference.CLAMP_TO_GROUND) {
            carto.height = heightOffset;
        } else {
            carto.height += heightOffset;
        }
        position = ellipsoid.cartographicToCartesian(carto, position);

        var orientation = Property.getValueOrUndefined(this._orientation, time, orientationScratch);
        if (!defined(orientation)) {
            result = Transforms.eastNorthUpToFixedFrame(position, undefined, result);
        } else {
            result = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, result);
        }
        return result;
    };

    /**
     * Checks if the given Scene supports materials besides Color on Entities draped on terrain or 3D Tiles.
     * If this feature is not supported, Entities with non-color materials but no `height` will
     * instead be rendered as if height is 0.
     *
     * @param {Scene} scene The current scene.
     * @returns {Boolean} Whether or not the current scene supports materials for entities on terrain.
     */
    Entity.supportsMaterialsforEntitiesOnTerrain = function(scene) {
        return GroundPrimitive.supportsMaterials(scene);
    };

    /**
     * Checks if the given Scene supports polylines clamped to terrain or 3D Tiles.
     * If this feature is not supported, Entities with PolylineGraphics will be rendered with vertices at
     * the provided heights and using the `arcType` parameter instead of clamped to the ground.
     *
     * @param {Scene} scene The current scene.
     * @returns {Boolean} Whether or not the current scene supports polylines on terrain or 3D TIles.
     */
    Entity.supportsPolylinesOnTerrain = function(scene) {
        return GroundPolylinePrimitive.isSupported(scene);
    };
export default Entity;
