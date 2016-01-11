/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipsoidGeometry',
        '../Core/EllipsoidOutlineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/Matrix4',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        '../Scene/SceneMode',
        './ColorMaterialProperty',
        './ConstantProperty',
        './dynamicGeometryGetBoundingSphere',
        './MaterialProperty',
        './Property'
    ], function(
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EllipsoidGeometry,
        EllipsoidOutlineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        Matrix4,
        ShowGeometryInstanceAttribute,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        SceneMode,
        ColorMaterialProperty,
        ConstantProperty,
        dynamicGeometryGetBoundingSphere,
        MaterialProperty,
        Property) {
    "use strict";

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ConstantProperty(true);
    var defaultOutline = new ConstantProperty(false);
    var defaultOutlineColor = new ConstantProperty(Color.BLACK);

    var radiiScratch = new Cartesian3();
    var scratchColor = new Color();
    var unitSphere = new Cartesian3(1, 1, 1);

    function GeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.radii = undefined;
        this.stackPartitions = undefined;
        this.slicePartitions = undefined;
        this.subdivisions = undefined;
    }

    /**
     * A {@link GeometryUpdater} for ellipsoids.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias EllipsoidGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function EllipsoidGeometryUpdater(entity, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._entity = entity;
        this._entitySubscription = entity.definitionChanged.addEventListener(EllipsoidGeometryUpdater.prototype._onEntityPropertyChanged, this);
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
        this._options = new GeometryOptions(entity);
        this._onEntityPropertyChanged(entity, 'ellipsoid', entity.ellipsoid, undefined);
    }

    defineProperties(EllipsoidGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof EllipsoidGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PerInstanceColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof EllipsoidGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : MaterialAppearance
        }
    });

    defineProperties(EllipsoidGeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
         * @memberof EllipsoidGeometryUpdater.prototype
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
    EllipsoidGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var entity = this._entity;
        return this._outlineEnabled && entity.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    EllipsoidGeometryUpdater.prototype.isFilled = function(time) {
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
    EllipsoidGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new EllipsoidGeometry(this._options),
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
    EllipsoidGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new EllipsoidOutlineGeometry(this._options),
            modelMatrix : entity._getModelMatrix(Iso8601.MINIMUM_VALUE),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
            }
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    EllipsoidGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    EllipsoidGeometryUpdater.prototype.destroy = function() {
        this._entitySubscription();
        destroyObject(this);
    };

    EllipsoidGeometryUpdater.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'position' || propertyName === 'orientation' || propertyName === 'ellipsoid')) {
            return;
        }

        var ellipsoid = entity.ellipsoid;

        if (!defined(ellipsoid)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = ellipsoid.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = ellipsoid.outline;
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
        var radii = ellipsoid.radii;

        var show = ellipsoid.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(radii))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(ellipsoid.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(ellipsoid.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(ellipsoid.outlineColor, defaultOutlineColor) : undefined;
        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        var stackPartitions = ellipsoid.stackPartitions;
        var slicePartitions = ellipsoid.slicePartitions;
        var outlineWidth = ellipsoid.outlineWidth;
        var subdivisions = ellipsoid.subdivisions;

        if (!position.isConstant || //
            !Property.isConstant(entity.orientation) || //
            !radii.isConstant || //
            !Property.isConstant(stackPartitions) || //
            !Property.isConstant(slicePartitions) || //
            !Property.isConstant(outlineWidth) || //
            !Property.isConstant(subdivisions)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
            options.radii = radii.getValue(Iso8601.MINIMUM_VALUE, options.radii);
            options.stackPartitions = defined(stackPartitions) ? stackPartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.slicePartitions = defined(slicePartitions) ? slicePartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.subdivisions = defined(subdivisions) ? subdivisions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
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
    EllipsoidGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
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
        this._entity = geometryUpdater._entity;
        this._scene = geometryUpdater._scene;
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._entity);
        this._modelMatrix = new Matrix4();
        this._material = undefined;
        this._attributes = undefined;
        this._outlineAttributes = undefined;
        this._lastSceneMode = undefined;
        this._lastShow = undefined;
        this._lastOutlineShow = undefined;
        this._lastOutlineWidth = undefined;
        this._lastOutlineColor = undefined;
    }
    DynamicGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var ellipsoid = entity.ellipsoid;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(ellipsoid.show, time, true)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }

            if (defined(this._outlinePrimitive)) {
                this._outlinePrimitive.show = false;
            }
            return;
        }

        var radii = Property.getValueOrUndefined(ellipsoid.radii, time, radiiScratch);
        var modelMatrix = entity._getModelMatrix(time, this._modelMatrix);
        if (!defined(modelMatrix) || !defined(radii)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }

            if (defined(this._outlinePrimitive)) {
                this._outlinePrimitive.show = false;
            }
            return;
        }

        //Compute attributes and material.
        var appearance;
        var showFill = Property.getValueOrDefault(ellipsoid.fill, time, true);
        var showOutline = Property.getValueOrDefault(ellipsoid.outline, time, false);
        var outlineColor = Property.getValueOrClonedDefault(ellipsoid.outlineColor, time, Color.BLACK, scratchColor);
        var material = MaterialProperty.getValue(time, defaultValue(ellipsoid.material, defaultMaterial), this._material);
        this._material = material;

        // Check properties that could trigger a primitive rebuild.
        var stackPartitions = Property.getValueOrUndefined(ellipsoid.stackPartitions, time);
        var slicePartitions = Property.getValueOrUndefined(ellipsoid.slicePartitions, time);
        var subdivisions = Property.getValueOrUndefined(ellipsoid.subdivisions, time);
        var outlineWidth = Property.getValueOrDefault(ellipsoid.outlineWidth, time, 1.0);

        //In 3D we use a fast path by modifying Primitive.modelMatrix instead of regenerating the primitive every frame.
        var sceneMode = this._scene.mode;
        var in3D = sceneMode === SceneMode.SCENE3D;

        var options = this._options;
        //We only rebuild the primitive if something other than the radii has changed
        //For the radii, we use unit sphere and then deform it with a scale matrix.
        var rebuildPrimitives = !in3D || this._lastSceneMode !== sceneMode || !defined(this._primitive) || //
                                options.stackPartitions !== stackPartitions || options.slicePartitions !== slicePartitions || //
                                options.subdivisions !== subdivisions || this._lastOutlineWidth !== outlineWidth;

        if (rebuildPrimitives) {
            var primitives = this._primitives;
            primitives.removeAndDestroy(this._primitive);
            primitives.removeAndDestroy(this._outlinePrimitive);
            this._primitive = undefined;
            this._outlinePrimitive = undefined;
            this._lastSceneMode = sceneMode;
            this._lastOutlineWidth = outlineWidth;

            options.stackPartitions = stackPartitions;
            options.slicePartitions = slicePartitions;
            options.subdivisions = subdivisions;
            options.radii = in3D ? unitSphere : radii;

            appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new EllipsoidGeometry(options),
                    modelMatrix : !in3D ? modelMatrix : undefined,
                    attributes : {
                        show : new ShowGeometryInstanceAttribute(showFill)
                    }
                }),
                appearance : appearance,
                asynchronous : false
            }));

            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new EllipsoidOutlineGeometry(options),
                    modelMatrix : !in3D ? modelMatrix : undefined,
                    attributes : {
                        show : new ShowGeometryInstanceAttribute(showOutline),
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : outlineColor.alpha !== 1.0,
                    renderState : {
                        lineWidth : this._geometryUpdater._scene.clampLineWidth(outlineWidth)
                    }
                }),
                asynchronous : false
            }));

            this._lastShow = showFill;
            this._lastOutlineShow = showOutline;
            this._lastOutlineColor = Color.clone(outlineColor, this._lastOutlineColor);
        } else if (this._primitive.ready) {
            //Update attributes only.
            var primitive = this._primitive;
            var outlinePrimitive = this._outlinePrimitive;

            primitive.show = true;
            outlinePrimitive.show = true;

            appearance = primitive.appearance;
            appearance.material = material;

            var attributes = this._attributes;
            if (!defined(attributes)) {
                attributes = primitive.getGeometryInstanceAttributes(entity);
                this._attributes = attributes;
            }
            if (showFill !== this._lastShow) {
                attributes.show = ShowGeometryInstanceAttribute.toValue(showFill, attributes.show);
                this._lastShow = showFill;
            }

            var outlineAttributes = this._outlineAttributes;

            if (!defined(outlineAttributes)) {
                outlineAttributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
                this._outlineAttributes = outlineAttributes;
            }

            if (showOutline !== this._lastOutlineShow) {
                outlineAttributes.show = ShowGeometryInstanceAttribute.toValue(showOutline, outlineAttributes.show);
                this._lastOutlineShow = showOutline;
            }

            if (!Color.equals(outlineColor, this._lastOutlineColor)) {
                outlineAttributes.color = ColorGeometryInstanceAttribute.toValue(outlineColor, outlineAttributes.color);
                Color.clone(outlineColor, this._lastOutlineColor);
            }
        }

        if (in3D) {
            //Since we are scaling a unit sphere, we can't let any of the values go to zero.
            //Instead we clamp them to a small value.  To the naked eye, this produces the same results
            //that you get passing EllipsoidGeometry a radii with a zero component.
            radii.x = Math.max(radii.x, 0.001);
            radii.y = Math.max(radii.y, 0.001);
            radii.z = Math.max(radii.z, 0.001);

            modelMatrix = Matrix4.multiplyByScale(modelMatrix, radii, modelMatrix);
            this._primitive.modelMatrix = modelMatrix;
            this._outlinePrimitive.modelMatrix = modelMatrix;
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

    return EllipsoidGeometryUpdater;
});
