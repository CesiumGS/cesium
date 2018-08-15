define([
        '../Core/BoundingSphere',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayCondition',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/GroundPolylineGeometry',
        '../Core/Iso8601',
        '../Core/PolylineGeometry',
        '../Core/PolylinePipeline',
        '../Core/ShowGeometryInstanceAttribute',
        '../DataSources/Entity',
        '../Scene/GroundPolylinePrimitive',
        '../Scene/PolylineCollection',
        '../Scene/PolylineColorAppearance',
        '../Scene/PolylineMaterialAppearance',
        '../Scene/ShadowMode',
        './BoundingSphereState',
        './ColorMaterialProperty',
        './ConstantProperty',
        './MaterialProperty',
        './Property'
    ], function(
        BoundingSphere,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        Event,
        GeometryInstance,
        GroundPolylineGeometry,
        Iso8601,
        PolylineGeometry,
        PolylinePipeline,
        ShowGeometryInstanceAttribute,
        Entity,
        GroundPolylinePrimitive,
        PolylineCollection,
        PolylineColorAppearance,
        PolylineMaterialAppearance,
        ShadowMode,
        BoundingSphereState,
        ColorMaterialProperty,
        ConstantProperty,
        MaterialProperty,
        Property) {
    'use strict';

    var defaultZIndex = new ConstantProperty(0);

    //We use this object to create one polyline collection per-scene.
    var polylineCollections = {};

    var scratchColor = new Color();
    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultShadows = new ConstantProperty(ShadowMode.DISABLED);
    var defaultDistanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

    function GeometryOptions() {
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
        this.followSurface = undefined;
        this.granularity = undefined;
    }

    function GroundGeometryOptions() {
        this.positions = undefined;
        this.width = undefined;
    }

    /**
     * A {@link GeometryUpdater} for polylines.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolylineGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function PolylineGeometryUpdater(entity, scene) {
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
        this._shadowsProperty = undefined;
        this._distanceDisplayConditionProperty = undefined;
        this._depthFailMaterialProperty = undefined;
        this._geometryOptions = new GeometryOptions();
        this._groundGeometryOptions = new GroundGeometryOptions();
        this._id = 'polyline-' + entity.id;
        this._clampToGround = false;
        this._supportsPolylinesOnTerrain = Entity.supportsPolylinesOnTerrain(scene);

        this._zIndex = 0;

        this._onEntityPropertyChanged(entity, 'polyline', entity.polyline, undefined);
    }

    defineProperties(PolylineGeometryUpdater.prototype, {
        /**
         * Gets the unique ID associated with this updater
         * @memberof PolylineGeometryUpdater.prototype
         * @type {String}
         * @readonly
         */
        id: {
            get: function() {
                return this._id;
            }
        },
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
         * Gets the material property used to fill the geometry when it fails the depth test.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {MaterialProperty}
         * @readonly
         */
        depthFailMaterialProperty : {
            get : function() {
                return this._depthFailMaterialProperty;
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
         * Gets the property specifying whether the geometry
         * casts or receives shadows from each light source.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        shadowsProperty : {
            get : function() {
                return this._shadowsProperty;
            }
        },
        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this geometry will be displayed.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        distanceDisplayConditionProperty : {
            get : function() {
                return this._distanceDisplayConditionProperty;
            }
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
        },

        /**
         * Gets a value indicating if the geometry is clamped to the ground.
         * Returns false if polylines on terrain is not supported.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        clampToGround : {
            get : function() {
                return this._clampToGround && this._supportsPolylinesOnTerrain;
            }
        },

        /**
         * Gets the zindex
         * @type {Number}
         * @memberof GroundGeometryUpdater.prototype
         * @readonly
         */
        zIndex: {
            get: function() {
                return this._zIndex;
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

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time));
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        var attributes = {
            show : show,
            distanceDisplayCondition : distanceDisplayConditionAttribute
        };

        var currentColor;
        if (this._materialProperty instanceof ColorMaterialProperty) {
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            attributes.color = ColorGeometryInstanceAttribute.fromColor(currentColor);
        }

        if (this.clampToGround) {
            return new GeometryInstance({
                id : entity,
                geometry : new GroundPolylineGeometry(this._groundGeometryOptions),
                attributes : attributes
            });
        }

        if (defined(this._depthFailMaterialProperty) && this._depthFailMaterialProperty instanceof ColorMaterialProperty) {
            if (defined(this._depthFailMaterialProperty.color) && (this._depthFailMaterialProperty.color.isConstant || isAvailable)) {
                currentColor = this._depthFailMaterialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            attributes.depthFailColor = ColorGeometryInstanceAttribute.fromColor(currentColor);
        }

        return new GeometryInstance({
            id : entity,
            geometry : new PolylineGeometry(this._geometryOptions),
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

        var zIndex = polyline.zIndex;
        var material = defaultValue(polyline.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._depthFailMaterialProperty = polyline.depthFailMaterial;
        this._showProperty = defaultValue(show, defaultShow);
        this._shadowsProperty = defaultValue(polyline.shadows, defaultShadows);
        this._distanceDisplayConditionProperty = defaultValue(polyline.distanceDisplayCondition, defaultDistanceDisplayCondition);
        this._fillEnabled = true;
        this._zIndex = defaultValue(zIndex, defaultZIndex);

        var width = polyline.width;
        var followSurface = polyline.followSurface;
        var clampToGround = polyline.clampToGround;
        var granularity = polyline.granularity;

        if (!positionsProperty.isConstant || !Property.isConstant(width) ||
            !Property.isConstant(followSurface) || !Property.isConstant(granularity) ||
            !Property.isConstant(clampToGround) || !Property.isConstant(zIndex)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var geometryOptions = this._geometryOptions;
            var positions = positionsProperty.getValue(Iso8601.MINIMUM_VALUE, geometryOptions.positions);

            //Because of the way we currently handle reference properties,
            //we can't automatically assume the positions are  always valid.
            if (!defined(positions) || positions.length < 2) {
                if (this._fillEnabled) {
                    this._fillEnabled = false;
                    this._geometryChanged.raiseEvent(this);
                }
                return;
            }

            var vertexFormat;
            if (isColorMaterial && (!defined(this._depthFailMaterialProperty) || this._depthFailMaterialProperty instanceof ColorMaterialProperty)) {
                vertexFormat = PolylineColorAppearance.VERTEX_FORMAT;
            } else {
                vertexFormat = PolylineMaterialAppearance.VERTEX_FORMAT;
            }

            geometryOptions.vertexFormat = vertexFormat;
            geometryOptions.positions = positions;
            geometryOptions.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            geometryOptions.followSurface = defined(followSurface) ? followSurface.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            geometryOptions.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;

            var groundGeometryOptions = this._groundGeometryOptions;
            groundGeometryOptions.positions = positions;
            groundGeometryOptions.width = geometryOptions.width;

            this._clampToGround = defined(clampToGround) ? clampToGround.getValue(Iso8601.MINIMUM_VALUE) : false;

            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     *
     * @param {PrimitiveCollection} primitives The primitive collection to use.
     * @param {PrimitiveCollection|OrderedGroundPrimitiveCollection} groundPrimitives The primitive collection to use for ordered ground primitives.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    PolylineGeometryUpdater.prototype.createDynamicUpdater = function(primitives, groundPrimitives) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('primitives', primitives);
        Check.defined('groundPrimitives', groundPrimitives);

        if (!this._dynamic) {
            throw new DeveloperError('This instance does not represent dynamic geometry.');
        }
        //>>includeEnd('debug');

        return new DynamicGeometryUpdater(primitives, groundPrimitives, this);
    };

    /**
     * @private
     */
    var generateCartesianArcOptions = {
        positions : undefined,
        granularity : undefined,
        height : undefined,
        ellipsoid : undefined
    };

    function DynamicGeometryUpdater(primitives, groundPrimitives, geometryUpdater) {
        this._line = undefined;
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._groundPolylinePrimitive = undefined;
        this._material = undefined;
        this._geometryUpdater = geometryUpdater;
        this._positions = [];
    }

    function getLine(dynamicGeometryUpdater) {
        if (defined(dynamicGeometryUpdater._line)) {
            return dynamicGeometryUpdater._line;
        }

        var sceneId = dynamicGeometryUpdater._geometryUpdater._scene.id;
        var polylineCollection = polylineCollections[sceneId];
        var primitives = dynamicGeometryUpdater._primitives;
        if (!defined(polylineCollection) || polylineCollection.isDestroyed()) {
            polylineCollection = new PolylineCollection();
            polylineCollections[sceneId] = polylineCollection;
            primitives.add(polylineCollection);
        } else if (!primitives.contains(polylineCollection)) {
            primitives.add(polylineCollection);
        }

        var line = polylineCollection.add();
        line.id = dynamicGeometryUpdater._geometryUpdater._entity;
        dynamicGeometryUpdater._line = line;
        return line;
    }

    DynamicGeometryUpdater.prototype.update = function(time) {
        var geometryUpdater = this._geometryUpdater;
        var entity = geometryUpdater._entity;
        var polyline = entity.polyline;

        var positionsProperty = polyline.positions;
        var positions = Property.getValueOrUndefined(positionsProperty, time, this._positions);

        // Synchronize with geometryUpdater for GroundPolylinePrimitive
        geometryUpdater._clampToGround = Property.getValueOrDefault(polyline._clampToGround, time, false);
        geometryUpdater._groundGeometryOptions.positions = positions;
        geometryUpdater._groundGeometryOptions.width = Property.getValueOrDefault(polyline._width, time, 1);

        var groundPrimitives = this._groundPrimitives;

        if (defined(this._groundPolylinePrimitive)) {
            groundPrimitives.remove(this._groundPolylinePrimitive); // destroys by default
            this._groundPolylinePrimitive = undefined;
        }

        if (geometryUpdater.clampToGround) {
            if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(polyline._show, time, true)) {
                return;
            }

            if (!defined(positions) || positions.length < 2) {
                return;
            }

            var fillMaterialProperty = geometryUpdater.fillMaterialProperty;
            var appearance;
            if (fillMaterialProperty instanceof ColorMaterialProperty) {
                appearance = new PolylineColorAppearance();
            } else {
                var material = MaterialProperty.getValue(time, fillMaterialProperty, this._material);
                appearance = new PolylineMaterialAppearance({
                    material : material,
                    translucent : material.isTranslucent()
                });
                this._material = material;
            }

            this._groundPolylinePrimitive = groundPrimitives.add(new GroundPolylinePrimitive({
                geometryInstances : geometryUpdater.createFillGeometryInstance(time),
                appearance : appearance,
                asynchronous : false
            }), Property.getValueOrUndefined(geometryUpdater.zIndex, time));

            // Hide the polyline in the collection, if any
            if (defined(this._line)) {
                this._line.show = false;
            }
            return;
        }

        var line = getLine(this);

        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(polyline._show, time, true)) {
            line.show = false;
            return;
        }

        if (!defined(positions) || positions.length < 2) {
            line.show = false;
            return;
        }

        var followSurface = Property.getValueOrDefault(polyline._followSurface, time, true);
        var globe = geometryUpdater._scene.globe;
        if (followSurface && defined(globe)) {
            generateCartesianArcOptions.ellipsoid = globe.ellipsoid;
            generateCartesianArcOptions.positions = positions;
            generateCartesianArcOptions.granularity = Property.getValueOrUndefined(polyline._granularity, time);
            generateCartesianArcOptions.height = PolylinePipeline.extractHeights(positions, globe.ellipsoid);
            positions = PolylinePipeline.generateCartesianArc(generateCartesianArcOptions);
        }

        line.show = true;
        line.positions = positions.slice();
        line.material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, line.material);
        line.width = Property.getValueOrDefault(polyline._width, time, 1);
        line.distanceDisplayCondition = Property.getValueOrUndefined(polyline._distanceDisplayCondition, time, line.distanceDisplayCondition);
    };

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('result', result);
        //>>includeEnd('debug');

        if (!this._geometryUpdater.clampToGround) {
            var line = getLine(this);
            if (line.show && line.positions.length > 0) {
                BoundingSphere.fromPoints(line.positions, result);
                return BoundingSphereState.DONE;
            }
        } else {
            var groundPolylinePrimitive = this._groundPolylinePrimitive;
            if (defined(groundPolylinePrimitive) && groundPolylinePrimitive.show && groundPolylinePrimitive.ready) {
                var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes(this._geometryUpdater._entity);
                if (defined(attributes) && defined(attributes.boundingSphere)) {
                    BoundingSphere.clone(attributes.boundingSphere, result);
                    return BoundingSphereState.DONE;
                }
            }

            if ((defined(groundPolylinePrimitive) && !groundPolylinePrimitive.ready)) {
                return BoundingSphereState.PENDING;
            }

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
        if (defined(polylineCollection)) {
            polylineCollection.remove(this._line);
            if (polylineCollection.length === 0) {
                this._primitives.removeAndDestroy(polylineCollection);
                delete polylineCollections[sceneId];
            }
        }
        if (defined(this._groundPolylinePrimitive)) {
            this._groundPrimitives.remove(this._groundPolylinePrimitive);
        }
        destroyObject(this);
    };

    return PolylineGeometryUpdater;
});
