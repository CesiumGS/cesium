/*global define*/
define([
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CorridorGeometry',
        '../Core/CorridorOutlineGeometry',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayCondition',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/oneTimeWarning',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        '../Scene/ShadowMode',
        './ColorMaterialProperty',
        './ConstantProperty',
        './dynamicGeometryGetBoundingSphere',
        './MaterialProperty',
        './Property'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        CorridorGeometry,
        CorridorOutlineGeometry,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        Event,
        GeometryInstance,
        Iso8601,
        oneTimeWarning,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ShadowMode,
        ColorMaterialProperty,
        ConstantProperty,
        dynamicGeometryGetBoundingSphere,
        MaterialProperty,
        Property) {
    'use strict';

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ConstantProperty(true);
    var defaultOutline = new ConstantProperty(false);
    var defaultOutlineColor = new ConstantProperty(Color.BLACK);
    var defaultShadows = new ConstantProperty(ShadowMode.DISABLED);
    var defaultDistanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
    var scratchColor = new Color();

    function GeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
        this.cornerType = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
    }

    /**
     * A {@link GeometryUpdater} for corridors.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias CorridorGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function CorridorGeometryUpdater(entity, scene) {
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
        this._entitySubscription = entity.definitionChanged.addEventListener(CorridorGeometryUpdater.prototype._onEntityPropertyChanged, this);
        this._fillEnabled = false;
        this._isClosed = false;
        this._dynamic = false;
        this._outlineEnabled = false;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._hasConstantOutline = true;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._outlineWidth = 1.0;
        this._shadowsProperty = undefined;
        this._distanceDisplayConditionProperty = undefined;
        this._onTerrain = false;
        this._options = new GeometryOptions(entity);

        this._onEntityPropertyChanged(entity, 'corridor', entity.corridor, undefined);
    }

    defineProperties(CorridorGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof CorridorGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PerInstanceColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof CorridorGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : MaterialAppearance
        }
    });

    defineProperties(CorridorGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof CorridorGeometryUpdater.prototype
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
         * @memberof CorridorGeometryUpdater.prototype
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
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantFill : {
            get : function() {
                return !this._fillEnabled ||
                       (!defined(this._entity.availability) &&
                        Property.isConstant(this._showProperty) &&
                        Property.isConstant(this._fillProperty));
            }
        },
        /**
         * Gets the material property used to fill the geometry.
         * @memberof CorridorGeometryUpdater.prototype
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
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        outlineEnabled : {
            get : function() {
                return this._outlineEnabled;
            }
        },
        /**
         * Gets a value indicating if the geometry has an outline component.
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantOutline : {
            get : function() {
                return !this._outlineEnabled ||
                       (!defined(this._entity.availability) &&
                        Property.isConstant(this._showProperty) &&
                        Property.isConstant(this._showOutlineProperty));
            }
        },
        /**
         * Gets the {@link Color} property for the geometry outline.
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        outlineColorProperty : {
            get : function() {
                return this._outlineColorProperty;
            }
        },
        /**
         * Gets the constant with of the geometry outline, in pixels.
         * This value is only valid if isDynamic is false.
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Number}
         * @readonly
         */
        outlineWidth : {
            get : function() {
                return this._outlineWidth;
            }
        },
        /**
         * Gets the property specifying whether the geometry
         * casts or receives shadows from each light source.
         * @memberof CorridorGeometryUpdater.prototype
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
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        distanceDisplayConditionProperty : {
            get : function() {
                return this._distanceDisplayCondition;
            }
        },
        /**
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof CorridorGeometryUpdater.prototype
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
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isClosed : {
            get : function() {
                return this._isClosed;
            }
        },
        /**
         * Gets a value indicating if the geometry should be drawn on terrain.
         * @memberof CorridorGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        onTerrain : {
            get : function() {
                return this._onTerrain;
            }
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof CorridorGeometryUpdater.prototype
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
    CorridorGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var entity = this._entity;
        return this._outlineEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    CorridorGeometryUpdater.prototype.isFilled = function(time) {
        var entity = this._entity;
        return this._fillEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._fillProperty.getValue(time);
    };

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    CorridorGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        var distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayCondition.getValue(time));
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayCondition,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayCondition
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new CorridorGeometry(this._options),
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
    CorridorGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK);

        return new GeometryInstance({
            id : entity,
            geometry : new CorridorOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayCondition.getValue(time))
            }
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    CorridorGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    CorridorGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    CorridorGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'corridor')) {
            return;
        }

        var corridor = this._entity.corridor;

        if (!defined(corridor)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = corridor.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = corridor.outline;
        var outlineEnabled = defined(outlineProperty);
        if (outlineEnabled && outlineProperty.isConstant) {
            outlineEnabled = outlineProperty.getValue(Iso8601.MINIMUM_VALUE);
        }

        if (!fillEnabled && !outlineEnabled) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var positions = corridor.positions;

        var show = corridor.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(positions))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(corridor.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(corridor.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(corridor.outlineColor, defaultOutlineColor) : undefined;
        this._shadowsProperty = defaultValue(corridor.shadows, defaultShadows);
        this._distanceDisplayCondition = defaultValue(corridor.distanceDisplayCondition, defaultDistanceDisplayCondition);

        var height = corridor.height;
        var extrudedHeight = corridor.extrudedHeight;
        var granularity = corridor.granularity;
        var width = corridor.width;
        var outlineWidth = corridor.outlineWidth;
        var cornerType = corridor.cornerType;
        var onTerrain = fillEnabled && !defined(height) && !defined(extrudedHeight) &&
                        isColorMaterial && GroundPrimitive.isSupported(this._scene);

        if (outlineEnabled && onTerrain) {
            oneTimeWarning(oneTimeWarning.geometryOutlines);
            outlineEnabled = false;
        }

        this._fillEnabled = fillEnabled;
        this._onTerrain = onTerrain;
        this._isClosed = defined(extrudedHeight) || onTerrain;
        this._outlineEnabled = outlineEnabled;

        if (!positions.isConstant || //
            !Property.isConstant(height) || //
            !Property.isConstant(extrudedHeight) || //
            !Property.isConstant(granularity) || //
            !Property.isConstant(width) || //
            !Property.isConstant(outlineWidth) || //
            !Property.isConstant(cornerType) || //
            (onTerrain && !Property.isConstant(material))) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
            options.positions = positions.getValue(Iso8601.MINIMUM_VALUE, options.positions);
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.cornerType = defined(cornerType) ? cornerType.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._outlineWidth = defined(outlineWidth) ? outlineWidth.getValue(Iso8601.MINIMUM_VALUE) : 1.0;
            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     *
     * @param {PrimitiveCollection} primitives The primitive collection to use.
     * @param {PrimitiveCollection} groundPrimitives The ground primitives collection to use.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    CorridorGeometryUpdater.prototype.createDynamicUpdater = function(primitives, groundPrimitives) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._dynamic) {
            throw new DeveloperError('This instance does not represent dynamic geometry.');
        }

        if (!defined(primitives)) {
            throw new DeveloperError('primitives is required.');
        }
        //>>includeEnd('debug');

        return new DynamicGeometryUpdater(primitives, groundPrimitives, this);
    };

    /**
     * @private
     */
    function DynamicGeometryUpdater(primitives, groundPrimitives, geometryUpdater) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._entity);
    }
    DynamicGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var geometryUpdater = this._geometryUpdater;
        var onTerrain = geometryUpdater._onTerrain;

        var primitives = this._primitives;
        var groundPrimitives = this._groundPrimitives;
        if (onTerrain) {
            groundPrimitives.removeAndDestroy(this._primitive);
        } else {
            primitives.removeAndDestroy(this._primitive);
            primitives.removeAndDestroy(this._outlinePrimitive);
            this._outlinePrimitive = undefined;
        }
        this._primitive = undefined;

        var entity = geometryUpdater._entity;
        var corridor = entity.corridor;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(corridor.show, time, true)) {
            return;
        }

        var options = this._options;
        var positions = Property.getValueOrUndefined(corridor.positions, time, options.positions);
        var width = Property.getValueOrUndefined(corridor.width, time);
        if (!defined(positions) || !defined(width)) {
            return;
        }

        options.positions = positions;
        options.width = width;
        options.height = Property.getValueOrUndefined(corridor.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(corridor.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(corridor.granularity, time);
        options.cornerType = Property.getValueOrUndefined(corridor.cornerType, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);
        var distanceDisplayCondition = this._geometryUpdater.distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        if (!defined(corridor.fill) || corridor.fill.getValue(time)) {
            var fillMaterialProperty = geometryUpdater.fillMaterialProperty;
            var material = MaterialProperty.getValue(time, fillMaterialProperty, this._material);
            this._material = material;

            if (onTerrain) {
                var currentColor = Color.WHITE;
                if (defined(fillMaterialProperty.color)) {
                    currentColor = fillMaterialProperty.color.getValue(time);
                }

                this._primitive = groundPrimitives.add(new GroundPrimitive({
                    geometryInstances : new GeometryInstance({
                        id : entity,
                        geometry : new CorridorGeometry(options),
                        attributes: {
                            color: ColorGeometryInstanceAttribute.fromColor(currentColor),
                            distanceDisplayCondition : distanceDisplayConditionAttribute
                        }
                    }),
                    asynchronous : false,
                    shadows : shadows
                }));
            } else {
                var appearance = new MaterialAppearance({
                    material : material,
                    translucent : material.isTranslucent(),
                    closed : defined(options.extrudedHeight)
                });
                options.vertexFormat = appearance.vertexFormat;

                this._primitive = primitives.add(new Primitive({
                    geometryInstances : new GeometryInstance({
                        id : entity,
                        geometry : new CorridorGeometry(options),
                        attributes : {
                            distanceDisplayCondition : distanceDisplayConditionAttribute
                        }
                    }),
                    appearance : appearance,
                    asynchronous : false,
                    shadows : shadows
                }));
            }
        }

        if (!onTerrain && defined(corridor.outline) && corridor.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(corridor.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(corridor.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new CorridorOutlineGeometry(options),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                        distanceDisplayCondition : distanceDisplayConditionAttribute
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : translucent,
                    renderState : {
                        lineWidth : geometryUpdater._scene.clampLineWidth(outlineWidth)
                    }
                }),
                asynchronous : false,
                shadows : shadows
            }));
        }
    };

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(entity, result) {
        return dynamicGeometryGetBoundingSphere(entity, this._primitive, this._outlinePrimitive, result);
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        var primitives = this._primitives;
        var groundPrimitives = this._groundPrimitives;
        if (this._geometryUpdater._onTerrain) {
            groundPrimitives.removeAndDestroy(this._primitive);
        } else {
            primitives.removeAndDestroy(this._primitive);
        }
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return CorridorGeometryUpdater;
});
