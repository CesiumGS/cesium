/*global define*/
define([
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipseGeometry',
        '../Core/EllipseOutlineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        './ColorMaterialProperty',
        './ConstantProperty',
        './MaterialProperty',
        './Property'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EllipseGeometry,
        EllipseOutlineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ColorMaterialProperty,
        ConstantProperty,
        MaterialProperty,
        Property) {
    "use strict";

    var defaultMaterial = ColorMaterialProperty.fromColor(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ConstantProperty(true);
    var defaultOutline = new ConstantProperty(false);
    var defaultOutlineColor = new ConstantProperty(Color.BLACK);

    var GeometryOptions = function(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.center = undefined;
        this.semiMajorAxis = undefined;
        this.semiMinorAxis = undefined;
        this.rotation = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.numberOfVerticalLines = undefined;
    };

    /**
     * A {@link GeometryUpdater} for ellipses.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias EllipseGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     */
    var EllipseGeometryUpdater = function(entity) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required');
        }
        //>>includeEnd('debug');

        this._entity = entity;
        this._entitySubscription = entity.definitionChanged.addEventListener(EllipseGeometryUpdater.prototype._onEntityPropertyChanged, this);
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
        this._options = new GeometryOptions(entity);
        this._onEntityPropertyChanged(entity, 'ellipse', entity.ellipse, undefined);
    };

    defineProperties(EllipseGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof EllipseGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PerInstanceColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof EllipseGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : MaterialAppearance
        }
    });

    defineProperties(EllipseGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof EllipseGeometryUpdater.prototype
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
         * @memberof EllipseGeometryUpdater.prototype
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
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof EllipseGeometryUpdater.prototype
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
    EllipseGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var entity = this._entity;
        return this._outlineEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    EllipseGeometryUpdater.prototype.isFilled = function(time) {
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
    EllipseGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
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
            geometry : new EllipseGeometry(this._options),
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
    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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

        return new GeometryInstance({
            id : entity,
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(isAvailable ? this._outlineColorProperty.getValue(time) : Color.BLACK)
            }
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    EllipseGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    EllipseGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    EllipseGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'position' || propertyName === 'ellipse')) {
            return;
        }

        var ellipse = this._entity.ellipse;

        if (!defined(ellipse)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = ellipse.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = ellipse.outline;
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

        var position = this._entity.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;

        var show = ellipse.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(semiMajorAxis) || !defined(semiMinorAxis))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(ellipse.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(ellipse.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(ellipse.outlineColor, defaultOutlineColor) : undefined;

        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;

        this._isClosed = defined(extrudedHeight);
        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        if (!position.isConstant || //
            !semiMajorAxis.isConstant || //
            !semiMinorAxis.isConstant || //
            !Property.isConstant(rotation) || //
            !Property.isConstant(height) || //
            !Property.isConstant(extrudedHeight) || //
            !Property.isConstant(granularity) || //
            !Property.isConstant(stRotation) || //
            !Property.isConstant(numberOfVerticalLines)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.center = position.getValue(Iso8601.MINIMUM_VALUE, options.center);
            options.semiMajorAxis = semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
            options.semiMinorAxis = semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
            options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
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
    EllipseGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
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
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._entity);
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var geometryUpdater = this._geometryUpdater;

        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        if (defined(this._outlinePrimitive)) {
            this._primitives.remove(this._outlinePrimitive);
        }

        var entity = geometryUpdater._entity;
        var ellipse = entity.ellipse;
        var show = ellipse.show;

        if (!entity.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;

        var position = entity.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;
        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;

        options.center = position.getValue(time, options.center);
        options.semiMajorAxis = semiMajorAxis.getValue(time, options.semiMajorAxis);
        options.semiMinorAxis = semiMinorAxis.getValue(time, options.semiMinorAxis);
        options.rotation = defined(rotation) ? rotation.getValue(time, options) : undefined;
        options.height = defined(height) ? height.getValue(time, options) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time) : undefined;

        if (!defined(ellipse.fill) || ellipse.fill.getValue(time)) {
            this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : defined(options.extrudedHeight)
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new EllipseGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(ellipse.outline) && ellipse.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
            options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(time) : undefined;

            var outlineColor = defined(ellipse.outlineColor) ? ellipse.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new EllipseOutlineGeometry(options),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : outlineColor.alpha !== 1.0
                }),
                asynchronous : false
            });
            this._primitives.add(this._outlinePrimitive);
        }
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        if (defined(this._outlinePrimitive)) {
            this._primitives.remove(this._outlinePrimitive);
        }
        destroyObject(this);
    };

    return EllipseGeometryUpdater;
});