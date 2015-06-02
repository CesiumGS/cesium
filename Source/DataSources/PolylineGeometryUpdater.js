/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/PolylineGeometry',
        '../Core/PolylinePipeline',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/PolylineCollection',
        '../Scene/PolylineColorAppearance',
        '../Scene/PolylineMaterialAppearance',
        './BoundingSphereState',
        './ColorMaterialProperty',
        './ConstantProperty',
        './MaterialProperty',
        './Property'
    ], function(
        BoundingSphere,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        Event,
        GeometryInstance,
        Iso8601,
        PolylineGeometry,
        PolylinePipeline,
        ShowGeometryInstanceAttribute,
        PolylineCollection,
        PolylineColorAppearance,
        PolylineMaterialAppearance,
        BoundingSphereState,
        ColorMaterialProperty,
        ConstantProperty,
        MaterialProperty,
        Property) {
    "use strict";

    //We use this object to create one polyline collection per-scene.
    var polylineCollections = {};

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);

    var GeometryOptions = function(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
        this.followSurface = undefined;
        this.granularity = undefined;
    };

    /**
     * A {@link GeometryUpdater} for polylines.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolylineGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    var PolylineGeometryUpdater = function(entity, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }
        //>>includeEnd('debug');

        this._entity = entity;
        this._scene = scene;
        this._entitySubscription = entity.definitionChanged.addEventListener(PolylineGeometryUpdater.prototype._onEntityPropertyChanged, this);
        this._fillEnabled = false;
        this._dynamic = false;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._options = new GeometryOptions(entity);
        this._onEntityPropertyChanged(entity, 'polyline', entity.polyline, undefined);
    };

    defineProperties(PolylineGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof PolylineGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PolylineColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof PolylineGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : PolylineMaterialAppearance
        }
    });

    defineProperties(PolylineGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Entity}
         * @readonly
         */
        entity : {
            get : function() {
                return this._entity;
            }
        },
        /**
         * Gets a value indicating if the geometry has a fill component.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        fillEnabled : {
            get : function() {
                return this._fillEnabled;
            }
        },
        /**
         * Gets a value indicating if fill visibility varies with simulation time.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantFill : {
            get : function() {
                return !this._fillEnabled || (!defined(this._entity.availability) && Property.isConstant(this._showProperty));
            }
        },
        /**
         * Gets the material property used to fill the geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {MaterialProperty}
         * @readonly
         */
        fillMaterialProperty : {
            get : function() {
                return this._materialProperty;
            }
        },
        /**
         * Gets a value indicating if the geometry has an outline component.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        outlineEnabled : {
            value : false
        },
        /**
         * Gets a value indicating if outline visibility varies with simulation time.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantOutline : {
            value : true
        },
        /**
         * Gets the {@link Color} property for the geometry outline.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        outlineColorProperty : {
            value : undefined
        },
        /**
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isDynamic : {
            get : function() {
                return this._dynamic;
            }
        },
        /**
         * Gets a value indicating if the geometry is closed.
         * This property is only valid for static geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isClosed : {
            value : false
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        geometryChanged : {
            get : function() {
                return this._geometryChanged;
            }
        }
    });

    /**
     * Checks if the geometry is outlined at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is outlined at the provided time, false otherwise.
     */
    PolylineGeometryUpdater.prototype.isOutlineVisible = function(time) {
        return false;
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    PolylineGeometryUpdater.prototype.isFilled = function(time) {
        var entity = this._entity;
        return this._fillEnabled && entity.isAvailable(time) && this._showProperty.getValue(time);
    };

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolylineGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var color;
        var attributes;
        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time));

        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                color : color
            };
        } else {
            attributes = {
                show : show
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new PolylineGeometry(this._options),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    PolylineGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('This instance does not represent an outlined geometry.');
        //>>includeEnd('debug');
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    PolylineGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    PolylineGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    PolylineGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'polyline')) {
            return;
        }

        var polyline = this._entity.polyline;

        if (!defined(polyline)) {
            if (this._fillEnabled) {
                this._fillEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var positionsProperty = polyline.positions;

        var show = polyline.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(positionsProperty))) {
            if (this._fillEnabled) {
                this._fillEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(polyline.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._showProperty = defaultValue(show, defaultShow);
        this._fillEnabled = true;

        var width = polyline.width;
        var followSurface = polyline.followSurface;
        var granularity = polyline.granularity;

        if (!positionsProperty.isConstant || !Property.isConstant(width) ||
            !Property.isConstant(followSurface) || !Property.isConstant(granularity)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            var positions = positionsProperty.getValue(Iso8601.MINIMUM_VALUE, options.positions);

            //Because of the way we currently handle reference properties,
            //we can't automatically assume the positions are  always valid.
            if (!defined(positions) || positions.length < 2) {
                if (this._fillEnabled) {
                    this._fillEnabled = false;
                    this._geometryChanged.raiseEvent(this);
                }
                return;
            }

            options.vertexFormat = isColorMaterial ? PolylineColorAppearance.VERTEX_FORMAT : PolylineMaterialAppearance.VERTEX_FORMAT;
            options.positions = positions;
            options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.followSurface = defined(followSurface) ? followSurface.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     *
     * @param {PrimitiveCollection} primitives The primitive collection to use.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    PolylineGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._dynamic) {
            throw new DeveloperError('This instance does not represent dynamic geometry.');
        }

        if (!defined(primitives)) {
            throw new DeveloperError('primitives is required.');
        }
        //>>includeEnd('debug');

        return new DynamicGeometryUpdater(primitives, this);
    };

    /**
     * @private
     */
    var DynamicGeometryUpdater = function(primitives, geometryUpdater) {
        var sceneId = geometryUpdater._scene.id;

        var polylineCollection = polylineCollections[sceneId];
        if (!defined(polylineCollection) || polylineCollection.isDestroyed()) {
            polylineCollection = new PolylineCollection();
            polylineCollections[sceneId] = polylineCollection;
            primitives.add(polylineCollection);
        } else if (!primitives.contains(polylineCollection)) {
            primitives.add(polylineCollection);
        }

        var line = polylineCollection.add();
        line.id = geometryUpdater._entity;

        this._line = line;
        this._primitives = primitives;
        this._geometryUpdater = geometryUpdater;
        this._positions = [];
    };

    var generateCartesianArcOptions = {
        positions : undefined,
        granularity : undefined,
        height : undefined
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        var geometryUpdater = this._geometryUpdater;
        var entity = geometryUpdater._entity;
        var polyline = entity.polyline;
        var line = this._line;

        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(polyline._show, time, true)) {
            line.show = false;
            return;
        }

        var positionsProperty = polyline.positions;
        var positions = Property.getValueOrUndefined(positionsProperty, time, this._positions);
        if (!defined(positions) || positions.length < 2) {
            line.show = false;
            return;
        }

        var followSurface = Property.getValueOrDefault(polyline._followSurface, time, true);
        if (followSurface) {
            generateCartesianArcOptions.positions = positions;
            generateCartesianArcOptions.granularity = Property.getValueOrUndefined(polyline._granularity, time);
            generateCartesianArcOptions.height = PolylinePipeline.extractHeights(positions, this._geometryUpdater._scene.globe.ellipsoid);
            positions = PolylinePipeline.generateCartesianArc(generateCartesianArcOptions);
        }

        line.show = true;
        line.positions = positions;
        line.material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, line.material);
        line.width = Property.getValueOrDefault(polyline._width, time, 1);
    };

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var line = this._line;
        if (line.show && line.positions.length > 0) {
            BoundingSphere.fromPoints(line.positions, result);
            return BoundingSphereState.DONE;
        }
        return BoundingSphereState.FAILED;
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        var geometryUpdater = this._geometryUpdater;
        var sceneId = geometryUpdater._scene.id;
        var polylineCollection = polylineCollections[sceneId];
        polylineCollection.remove(this._line);
        if (polylineCollection.length === 0) {
            this._primitives.removeAndDestroy(polylineCollection);
            delete polylineCollections[sceneId];
        }
        destroyObject(this);
    };

    return PolylineGeometryUpdater;
});