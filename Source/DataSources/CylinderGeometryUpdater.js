/*global define*/
define([
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CylinderGeometry',
        '../Core/CylinderOutlineGeometry',
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
        '../Core/ShowGeometryInstanceAttribute',
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
        CylinderGeometry,
        CylinderOutlineGeometry,
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
        ShowGeometryInstanceAttribute,
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
        this.length = undefined;
        this.topRadius = undefined;
        this.bottomRadius = undefined;
        this.slices = undefined;
        this.numberOfVerticalLines = undefined;
    }

    /**
     * A {@link GeometryUpdater} for cylinders.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias CylinderGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function CylinderGeometryUpdater(entity, scene) {
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
        this._entitySubscription = entity.definitionChanged.addEventListener(CylinderGeometryUpdater.prototype._onEntityPropertyChanged, this);
        this._fillEnabled = false;
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
        this._options = new GeometryOptions(entity);
        this._onEntityPropertyChanged(entity, 'cylinder', entity.cylinder, undefined);
    }

    defineProperties(CylinderGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof CylinderGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PerInstanceColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof CylinderGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : MaterialAppearance
        }
    });

    defineProperties(CylinderGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * Gets a value indicating if outline visibility varies with simulation time.
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
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
         * @memberof CylinderGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isClosed : {
            value : true
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof CylinderGeometryUpdater.prototype
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
    CylinderGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var entity = this._entity;
        return this._outlineEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    CylinderGeometryUpdater.prototype.isFilled = function(time) {
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
    CylinderGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new CylinderGeometry(this._options),
            modelMatrix : entity._getModelMatrix(Iso8601.MINIMUM_VALUE),
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
    CylinderGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);

        return new GeometryInstance({
            id : entity,
            geometry : new CylinderOutlineGeometry(this._options),
            modelMatrix : entity._getModelMatrix(Iso8601.MINIMUM_VALUE),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    CylinderGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    CylinderGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    CylinderGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'position' || propertyName === 'orientation' || propertyName === 'cylinder')) {
            return;
        }

        var cylinder = entity.cylinder;

        if (!defined(cylinder)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = cylinder.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = cylinder.outline;
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

        var position = entity.position;
        var length = cylinder.length;
        var topRadius = cylinder.topRadius;
        var bottomRadius = cylinder.bottomRadius;

        var show = cylinder.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(length) || !defined(topRadius) || !defined(bottomRadius))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(cylinder.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(cylinder.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(cylinder.outlineColor, defaultOutlineColor) : undefined;
        this._shadowsProperty = defaultValue(cylinder.shadows, defaultShadows);
        this._distanceDisplayConditionProperty = defaultValue(cylinder.distanceDisplayCondition, defaultDistanceDisplayCondition);

        var slices = cylinder.slices;
        var outlineWidth = cylinder.outlineWidth;
        var numberOfVerticalLines = cylinder.numberOfVerticalLines;

        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        if (!position.isConstant || //
            !Property.isConstant(entity.orientation) || //
            !length.isConstant || //
            !topRadius.isConstant || //
            !bottomRadius.isConstant || //
            !Property.isConstant(slices) || //
            !Property.isConstant(outlineWidth) || //
            !Property.isConstant(numberOfVerticalLines)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
            options.length = length.getValue(Iso8601.MINIMUM_VALUE);
            options.topRadius = topRadius.getValue(Iso8601.MINIMUM_VALUE);
            options.bottomRadius = bottomRadius.getValue(Iso8601.MINIMUM_VALUE);
            options.slices = defined(slices) ? slices.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._outlineWidth = defined(outlineWidth) ? outlineWidth.getValue(Iso8601.MINIMUM_VALUE) : 1.0;
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
    CylinderGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
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
    function DynamicGeometryUpdater(primitives, geometryUpdater) {
        this._primitives = primitives;
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

        var primitives = this._primitives;
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        this._primitive = undefined;
        this._outlinePrimitive = undefined;

        var geometryUpdater = this._geometryUpdater;
        var entity = geometryUpdater._entity;
        var cylinder = entity.cylinder;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(cylinder.show, time, true)) {
            return;
        }

        var options = this._options;
        var modelMatrix = entity._getModelMatrix(time);
        var length = Property.getValueOrUndefined(cylinder.length, time);
        var topRadius = Property.getValueOrUndefined(cylinder.topRadius, time);
        var bottomRadius = Property.getValueOrUndefined(cylinder.bottomRadius, time);
        if (!defined(modelMatrix) || !defined(length) || !defined(topRadius) || !defined(bottomRadius)) {
            return;
        }

        options.length = length;
        options.topRadius = topRadius;
        options.bottomRadius = bottomRadius;
        options.slices = Property.getValueOrUndefined(cylinder.slices, time);
        options.numberOfVerticalLines = Property.getValueOrUndefined(cylinder.numberOfVerticalLines, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        var distanceDisplayConditionProperty = this._geometryUpdater.distanceDisplayConditionProperty;
        var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        
        if (Property.getValueOrDefault(cylinder.fill, time, true)) {
            var material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            this._material = material;

            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new CylinderGeometry(options),
                    modelMatrix : modelMatrix,
                    attributes : {
                        distanceDisplayCondition : distanceDisplayConditionAttribute
                    }
                }),
                appearance : appearance,
                asynchronous : false,
                shadows : shadows
            }));
        }

        if (Property.getValueOrDefault(cylinder.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(cylinder.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(cylinder.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new CylinderOutlineGeometry(options),
                    modelMatrix : modelMatrix,
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
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return CylinderGeometryUpdater;
});
