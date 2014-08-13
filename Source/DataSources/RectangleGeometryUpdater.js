/*global define*/
define([
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/RectangleGeometry',
        '../Core/RectangleOutlineGeometry',
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
        Event,
        GeometryInstance,
        Iso8601,
        RectangleGeometry,
        RectangleOutlineGeometry,
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
        this.rectangle = undefined;
        this.closeBottom = undefined;
        this.closeTop = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.rotation = undefined;
    };

    /**
     * A {@link GeometryUpdater} for rectangles.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias RectangleGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     */
    var RectangleGeometryUpdater = function(entity) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required');
        }
        //>>includeEnd('debug');

        this._entity = entity;
        this._entitySubscription = entity.definitionChanged.addEventListener(RectangleGeometryUpdater.prototype._onEntityPropertyChanged, this);
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
        this._onEntityPropertyChanged(entity, 'rectangle', entity.rectangle, undefined);
    };

    defineProperties(RectangleGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof RectangleGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PerInstanceColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof RectangleGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : MaterialAppearance
        }
    });

    defineProperties(RectangleGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
         * @memberof RectangleGeometryUpdater.prototype
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
    RectangleGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var entity = this._entity;
        return this._outlineEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    RectangleGeometryUpdater.prototype.isFilled = function(time) {
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
    RectangleGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new RectangleGeometry(this._options),
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
    RectangleGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new RectangleOutlineGeometry(this._options),
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
    RectangleGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    RectangleGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    RectangleGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'rectangle')) {
            return;
        }

        var rectangle = this._entity.rectangle;

        if (!defined(rectangle)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = rectangle.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = rectangle.outline;
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

        var coordinates = rectangle.coordinates;

        var show = rectangle.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(coordinates))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(rectangle.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(rectangle.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(rectangle.outlineColor, defaultOutlineColor) : undefined;

        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;
        var granularity = rectangle.granularity;
        var stRotation = rectangle.stRotation;
        var rotation = rectangle.rotation;
        var closeBottom = rectangle.closeBottom;
        var closeTop = rectangle.closeTop;

        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        if (!coordinates.isConstant || //
            !Property.isConstant(height) || //
            !Property.isConstant(extrudedHeight) || //
            !Property.isConstant(granularity) || //
            !Property.isConstant(stRotation) || //
            !Property.isConstant(rotation) || //
            !Property.isConstant(closeBottom) || //
            !Property.isConstant(closeTop)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.rectangle = coordinates.getValue(Iso8601.MINIMUM_VALUE, options.rectangle);
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.closeBottom = defined(closeBottom) ? closeBottom.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.closeTop = defined(closeTop) ? closeTop.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._isClosed = defined(extrudedHeight) && defined(options.closeTop) && defined(options.closeBottom) && options.closeTop && options.closeBottom;
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
    RectangleGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
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
        var rectangle = entity.rectangle;
        var show = rectangle.show;

        if (!entity.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;

        var coordinates = rectangle.coordinates;
        var closeBottom = rectangle.closeBottom;
        var closeTop = rectangle.closeTop;
        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;
        var granularity = rectangle.granularity;
        var stRotation = rectangle.stRotation;
        var rotation = rectangle.rotation;

        options.rectangle = coordinates.getValue(time, options.rectangle);
        options.height = defined(height) ? height.getValue(time, options) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time) : undefined;
        options.rotation = defined(rotation) ? rotation.getValue(time) : undefined;

        if (!defined(rectangle.fill) || rectangle.fill.getValue(time)) {
            options.closeBottom = defined(closeBottom) ? closeBottom.getValue(time) : undefined;
            options.closeTop = defined(closeTop) ? closeTop.getValue(time) : undefined;

            this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : options.closeTop && options.closeBottom
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new RectangleGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(rectangle.outline) && rectangle.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = defined(rectangle.outlineColor) ? rectangle.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new RectangleOutlineGeometry(options),
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

    return RectangleGeometryUpdater;
});